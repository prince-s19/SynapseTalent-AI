import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AnalyzeResult } from "./analysis";
import type { CareerRoadmap, RoadmapStep } from "./types";

const EmployeeInput = z.object({ employeeId: z.string().uuid() });

/**
 * analyze-employee — evidence-based skill extraction.
 * The model may only use the supplied declared skills, projects, certifications
 * and consented public enrichment. It must never invent evidence.
 */
export const analyzeEmployee = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmployeeInput.parse(input))
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    const { analyzeEmployeeInternal } = await import("./analyze.server");
    return analyzeEmployeeInternal(data.employeeId);
  });

const RoadmapInput = z.object({
  employeeId: z.string().uuid(),
  targetRoleId: z.string().uuid(),
});

const RoadmapSchema = z.object({
  estimated_months: z.number().optional(),
  summary: z.string().nullable().optional(),
  steps: z
    .array(
      z.object({
        month: z.number(),
        skill: z.string(),
        action: z.string(),
        project: z.string().nullable().optional(),
        outcome: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

/** generate-career-roadmap — built from the actual identified skill gaps. */
export const generateCareerRoadmap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RoadmapInput.parse(input))
  .handler(async ({ data }): Promise<{ roadmap: CareerRoadmap; notice: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadEmployeeContext } = await import("./context.server");
    const { callGateway, parseJsonResponse, AiGatewayError } = await import("@/lib/ai-gateway.server");
    const { buildRoadmapFallback } = await import("./matching");

    const context = await loadEmployeeContext(data.employeeId);
    const match = context.matches.find((item) => item.roleId === data.targetRoleId);
    const role = context.roles.find((item) => item.id === data.targetRoleId);
    if (!match || !role) throw new Error("That internal role is not part of the demo environment.");

    const fallback = buildRoadmapFallback(match, role.title);
    let roadmap: CareerRoadmap = fallback;
    let notice: string | null = null;

    try {
      const raw = await callGateway(
        [
          {
            role: "system",
            content: [
              "You build concise internal career roadmaps for SynapseTalent.ai.",
              "Use ONLY the supplied skill gaps. Do not invent gaps, courses with fake names, or evidence.",
              "One skill per month, 3 to 6 months, each month with a concrete action and an internal project.",
              "The final step must be an internal opportunity readiness review.",
              'Return JSON only: {"estimated_months": number, "summary": string, "steps": [{"month", "skill", "action", "project", "outcome"}]}',
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `EMPLOYEE: ${context.employee.name} — ${context.employee.current_role} (${context.employee.department})`,
              `TARGET ROLE: ${role.title} (${role.department}), current projected readiness ${match.matchScore}%`,
              "",
              "IDENTIFIED SKILL GAPS:",
              ...match.gaps.map(
                (gap) =>
                  `- ${gap.skill}: current ${gap.current}%, required ${gap.required}%${
                    gap.closestTransferable
                      ? `, closest transferable skill ${gap.closestTransferable.viaSkill} at ${gap.closestTransferable.viaProficiency}%`
                      : ""
                  }`,
              ),
              "",
              "EXISTING STRENGTHS:",
              ...match.strengths
                .slice(0, 5)
                .map((strength) => `- ${strength.skill} at ${strength.proficiency}%`),
            ].join("\n"),
          },
        ],
        { json: true },
      );
      const parsed = RoadmapSchema.safeParse(parseJsonResponse<unknown>(raw));
      if (parsed.success && parsed.data.steps.length > 0) {
        const steps: RoadmapStep[] = parsed.data.steps
          .sort((a, b) => a.month - b.month)
          .map((step, index) => ({
            month: index + 1,
            skill: step.skill,
            action: step.action,
            ...(step.project ? { project: step.project } : {}),
            ...(step.outcome ? { outcome: step.outcome } : {}),
          }));
        roadmap = {
          steps,
          estimatedMonths: parsed.data.estimated_months ?? steps.length,
          ...(parsed.data.summary ? { summary: parsed.data.summary } : {}),
          source: "ai",
        };
      } else {
        notice = "Generated from identified skill gaps without AI enrichment.";
      }
    } catch (error) {
      console.error("[generate-career-roadmap]", error);
      notice =
        error instanceof AiGatewayError
          ? `${error.message} Showing a roadmap built directly from your skill gaps.`
          : "AI roadmap generation is unavailable. Showing a roadmap built directly from your skill gaps.";
    }

    await supabaseAdmin.from("career_roadmaps").upsert(
      {
        employee_id: data.employeeId,
        target_role_id: data.targetRoleId,
        roadmap: JSON.parse(JSON.stringify(roadmap)) as never,
        estimated_months: roadmap.estimatedMonths,
      },
      { onConflict: "employee_id,target_role_id" },
    );

    return { roadmap, notice };
  });

const AssistantInput = z.object({
  employeeId: z.string().uuid(),
  question: z.string().min(2).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(8)
    .default([]),
});

/** career-assistant — answers only from the selected employee's own data. */
export const askCareerAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AssistantInput.parse(input))
  .handler(async ({ data }): Promise<{ answer: string; notice: string | null }> => {
    const { loadEmployeeContext, describeContext } = await import("./context.server");
    const { callGateway, AiGatewayError } = await import("@/lib/ai-gateway.server");

    const context = await loadEmployeeContext(data.employeeId);

    try {
      const answer = await callGateway([
        {
          role: "system",
          content: [
            "You are the SynapseTalent.ai career assistant inside a demo environment with fictional employees.",
            `You are helping ${context.employee.name} only. Never mention or compare other employees.`,
            "Answer from the supplied context only: skills, projects, evidence, role matches, gaps and roadmaps.",
            "Never invent evidence, courses, scores or company data. If the context does not contain the answer, say so.",
            "Be concise: under 140 words, short paragraphs or bullets, always citing the evidence behind a claim.",
            "Say 'projected role readiness', never guaranteed outcomes or promotion promises.",
          ].join("\n"),
        },
        { role: "user", content: `CONTEXT:\n${describeContext(context)}` },
        ...data.history,
        { role: "user", content: data.question },
      ]);
      return { answer, notice: null };
    } catch (error) {
      console.error("[career-assistant]", error);
      const best = context.matches[0];
      const fallback = best
        ? `AI chat is unavailable right now, so here is the deterministic view from your demo data: your strongest internal match is ${best.roleTitle} at ${best.matchScore}% projected readiness (${best.readiness}). Biggest gaps: ${best.gaps
            .slice(0, 3)
            .map((gap) => `${gap.skill} ${gap.current}% → ${gap.required}%`)
            .join(", ")}.`
        : "AI chat is unavailable right now and no role matches are available for this profile.";
      return {
        answer: fallback,
        notice: error instanceof AiGatewayError ? error.message : "Using demo data",
      };
    }
  });
