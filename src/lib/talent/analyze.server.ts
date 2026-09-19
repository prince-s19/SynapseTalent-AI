/**
 * Evidence-constrained skill analysis. Server-only.
 *
 * The model may only use declared skills, projects, certifications and
 * consented public enrichment already stored for the employee. It must never
 * invent evidence. Scoring itself is deterministic (see matching.ts): this
 * project does not implement graph neural networks, SHAP or federated learning.
 */
import { z } from "zod";

import type { AnalyzeResult, LearningAction } from "./analysis";
import type { HiddenSkillCard } from "./types";

export type { AnalyzeResult };


const AnalysisSchema = z.object({
  skills: z
    .array(
      z.object({
        skill: z.string(),
        proficiency: z.number(),
        confidence: z.number(),
        source: z.string(),
        evidence: z.string(),
        skill_type: z.string(),
        explanation: z.string().nullable().optional(),
        confidence_basis: z.string().nullable().optional(),
      }),
    )
    .default([]),
  learning_actions: z
    .array(
      z.object({
        skill: z.string(),
        action: z.string(),
        rationale: z.string().nullable().optional(),
        priority: z.string().nullable().optional(),
      }),
    )
    .default([]),
  summary: z.string().nullable().optional(),
});


export async function analyzeEmployeeInternal(
  employeeId: string,
  options: { ignoreConsent?: boolean } = {},
): Promise<AnalyzeResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { loadEmployeeContext, describeContext } = await import("./context.server");
  const { callGateway, parseJsonResponse, AiGatewayError } = await import(
    "@/lib/ai-gateway.server"
  );
  const { buildSkillVector, scoreAllRoles } = await import("./matching");

  const context = await loadEmployeeContext(employeeId);

  const catalogue = await supabaseAdmin.from("skills").select("id,name,category");
  if (catalogue.error) throw new Error(catalogue.error.message);
  const skillIdByName = new Map((catalogue.data ?? []).map((row) => [row.name.toLowerCase(), row]));

  const existingHidden = (): HiddenSkillCard[] =>
    context.skills
      .filter((skill) => skill.skill_type !== "direct" && skill.evidence)
      .sort((a, b) => b.proficiency - a.proficiency)
      .map((skill) => ({
        skill: skill.name,
        proficiency: Math.round(skill.proficiency),
        confidence: Math.round(skill.confidence),
        source: skill.source,
        evidence: skill.evidence ?? "",
        explanation: `Inferred from ${skill.source} evidence rather than ${context.employee.name}'s job title.`,
        skillType: skill.skill_type,
      }));

  if (!context.aiAnalysisEnabled && !options.ignoreConsent) {
    return {
      source: "existing",
      notice: "AI skill analysis is switched off in Privacy & Consent. Showing existing demo data.",
      updated: 0,
      hiddenSkills: existingHidden(),
      learningActions: [],
      summary: null,
    };
  }

  const gapBrief = context.matches.slice(0, 3).flatMap((match) =>
    match.gaps
      .slice(0, 5)
      .map(
        (gap) =>
          `- ${match.roleTitle}: ${gap.skill} current ${gap.current}%, required ${gap.required}%`,
      ),
  );

  const systemPrompt = [
    "You are the skill intelligence engine of SynapseTalent.ai, an internal talent mobility platform.",
    "Produce a structured skill analysis strictly from the evidence provided.",
    "HARD RULES:",
    "1. Never invent evidence. Every skill you return must quote or closely paraphrase a supplied project, certification, declared skill or consented public enrichment item.",
    "2. If there is no evidence for a skill, do not return it. Never invent courses, employers, metrics or public activity.",
    "3. Only return skills from the ALLOWED SKILLS list.",
    "4. skill_type must be 'direct' (core to the current role), 'hidden' (demonstrated but not reflected in the job title) or 'transferable' (adjacent capability implied by demonstrated work). Transferability is not equivalence.",
    "5. source must be one of declared, project, certification, github, portfolio, ai_inferred, and must name where the evidence came from.",
    "6. proficiency and confidence are integers 0-100. Be conservative when evidence is thin: one indirect signal is below 50, one solid evidence item is 50-74, multiple strong items are 75+.",
    "7. confidence_basis is one short sentence explaining why that confidence level was assigned.",
    "8. learning_actions must reference ONLY the supplied skill gaps, with priority 'high', 'medium' or 'low'.",
    "9. Use professional, neutral wording. Say 'projected role readiness', never guaranteed outcomes.",
    "10. Do not claim this system uses graph neural networks, SHAP or federated learning — explanations are evidence-based only.",
    'Return concise JSON only, no prose: {"summary": string, "skills": [{"skill", "proficiency", "confidence", "source", "evidence", "skill_type", "explanation", "confidence_basis"}], "learning_actions": [{"skill", "action", "rationale", "priority"}]}',
  ].join("\n");

  const userPrompt = [
    describeContext(context, false),
    "",
    `ALLOWED SKILLS: ${(catalogue.data ?? []).map((row) => row.name).join(", ")}`,
    "",
    gapBrief.length > 0 ? ["IDENTIFIED SKILL GAPS:", ...gapBrief, ""].join("\n") : "",
    "Return up to 18 skills covering declared, discovered, hidden and transferable skills, and up to 6 learning actions.",
    "Prioritise hidden and transferable skills that the job title would hide.",
  ]
    .filter(Boolean)
    .join("\n");

  let analysis: z.infer<typeof AnalysisSchema> | null = null;
  let notice: string | null = null;

  try {
    const raw = await callGateway(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { json: true },
    );
    const validated = AnalysisSchema.safeParse(parseJsonResponse<unknown>(raw));
    if (validated.success) analysis = validated.data;
    else notice = "The AI response could not be read. Showing existing demo data.";
  } catch (error) {
    console.error("[analyze-employee]", error);
    notice =
      error instanceof AiGatewayError
        ? `${error.message} Showing existing demo data.`
        : "AI analysis is unavailable right now. Showing existing demo data.";
  }

  if (!analysis) {
    return {
      source: "existing",
      notice,
      updated: 0,
      hiddenSkills: existingHidden(),
      learningActions: [],
      summary: null,
    };
  }

  const allowedSources = new Set([
    "declared",
    "project",
    "certification",
    "github",
    "portfolio",
    "ai_inferred",
  ]);
  const allowedTypes = new Set(["direct", "hidden", "transferable"]);
  const declaredSkillIds = new Set(
    context.skills.filter((skill) => skill.source === "declared").map((skill) => skill.skill_id),
  );

  const rows = analysis.skills
    .map((item) => {
      const match = skillIdByName.get(item.skill.trim().toLowerCase());
      if (!match) return null;
      const evidence = item.evidence?.trim();
      if (!evidence || evidence.length < 8) return null;
      if (declaredSkillIds.has(match.id)) return null;
      return {
        employee_id: employeeId,
        skill_id: match.id,
        proficiency: Math.max(0, Math.min(100, Math.round(item.proficiency))),
        confidence: Math.max(0, Math.min(100, Math.round(item.confidence))),
        source: allowedSources.has(item.source) ? item.source : "ai_inferred",
        evidence,
        skill_type: allowedTypes.has(item.skill_type) ? item.skill_type : "hidden",
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length > 0) {
    const upsert = await supabaseAdmin
      .from("employee_skills")
      .upsert(rows, { onConflict: "employee_id,skill_id" });
    if (upsert.error) throw new Error(upsert.error.message);
  }

  // Recompute and persist deterministic role matches for this employee.
  const refreshed = await loadEmployeeContext(employeeId);
  const matches = scoreAllRoles(buildSkillVector(refreshed.skills), refreshed.roles);
  const matchRows = matches.map((match) => ({
    employee_id: employeeId,
    role_id: match.roleId,
    match_score: match.matchScore,
    semantic_score: match.semanticScore,
    skill_coverage_score: match.skillCoverageScore,
    transferable_score: match.transferableScore,
    explanation: JSON.parse(JSON.stringify(match.strengths.slice(0, 4))) as never,
    skill_gaps: JSON.parse(JSON.stringify(match.gaps)) as never,
  }));
  await supabaseAdmin.from("role_matches").upsert(matchRows, { onConflict: "employee_id,role_id" });

  const hiddenSkills: HiddenSkillCard[] = analysis.skills
    .filter((item) => item.skill_type !== "direct")
    .map((item) => ({
      skill: item.skill,
      proficiency: Math.round(item.proficiency),
      confidence: Math.round(item.confidence),
      source: item.source,
      evidence: item.evidence,
      explanation:
        item.explanation ??
        item.confidence_basis ??
        "Discovered from demonstrated work, not the job title.",
      skillType: item.skill_type,
    }))
    .filter((item) => Boolean(item.evidence))
    .sort((a, b) => b.proficiency - a.proficiency);

  const gapSkills = new Set(
    matches.slice(0, 3).flatMap((match) => match.gaps.map((gap) => gap.skill.toLowerCase())),
  );
  const priorities = new Set(["high", "medium", "low"]);
  const learningActions: LearningAction[] = analysis.learning_actions
    .filter((item) => item.skill && item.action && gapSkills.has(item.skill.trim().toLowerCase()))
    .slice(0, 6)
    .map((item) => ({
      skill: item.skill.trim(),
      action: item.action.trim(),
      rationale: item.rationale?.trim() || "Addresses a gap identified in the strongest matches.",
      priority: (priorities.has((item.priority ?? "").toLowerCase())
        ? (item.priority ?? "").toLowerCase()
        : "medium") as LearningAction["priority"],
    }));

  return {
    source: "ai",
    notice,
    updated: rows.length,
    hiddenSkills: hiddenSkills.length > 0 ? hiddenSkills : existingHidden(),
    learningActions,
    summary: analysis.summary ?? null,
  };
}
