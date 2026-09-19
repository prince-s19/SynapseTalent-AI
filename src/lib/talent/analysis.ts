/**
 * Structured skill analysis assembled from stored evidence plus the AI extraction run.
 *
 * Scoring is transparent and deterministic (see matching.ts). This project does NOT
 * implement graph neural networks, SHAP attribution or federated learning; explanations
 * are evidence-based and rule-driven.
 */
import type { EmployeeSkill, HiddenSkillCard, MatchResult, SkillGap } from "./types";

export type ConfidenceBand = "high" | "medium" | "low";

export interface ConfidenceExplanation {
  band: ConfidenceBand;
  label: string;
  explanation: string;
}

export function confidenceBand(confidence: number): ConfidenceExplanation {
  if (confidence >= 75) {
    return {
      band: "high",
      label: "High confidence",
      explanation:
        "Supported by strong, directly attributable evidence such as a declared skill, a delivered project or a certification.",
    };
  }
  if (confidence >= 50) {
    return {
      band: "medium",
      label: "Medium confidence",
      explanation:
        "Supported by a single evidence item. The proficiency shown is an estimate and should be confirmed in a conversation.",
    };
  }
  return {
    band: "low",
    label: "Low confidence",
    explanation:
      "Based on indirect or adjacent evidence only. Treat this as a signal worth exploring, not as an assessment.",
  };
}

export interface LearningAction {
  skill: string;
  action: string;
  rationale: string;
  priority: "high" | "medium" | "low";
}

/** Result of one AI extraction run. */
export interface AnalyzeResult {
  source: "ai" | "existing";
  notice: string | null;
  updated: number;
  hiddenSkills: HiddenSkillCard[];
  learningActions: LearningAction[];
  summary: string | null;
}

export interface SkillAnalysis {
  declared: EmployeeSkill[];
  discovered: EmployeeSkill[];
  hidden: EmployeeSkill[];
  transferable: EmployeeSkill[];
  recommendedRoles: MatchResult[];
  gaps: Array<SkillGap & { roleTitle: string }>;
  learningActions: LearningAction[];
  confidenceMix: Record<ConfidenceBand, number>;
}

const byProficiency = (a: EmployeeSkill, b: EmployeeSkill) => b.proficiency - a.proficiency;

function deriveActions(gaps: Array<SkillGap & { roleTitle: string }>): LearningAction[] {
  return gaps.slice(0, 6).map((gap, index) => {
    const distance = Math.max(0, gap.required - gap.current);
    const bridge = gap.closestTransferable;
    return {
      skill: gap.skill,
      action: bridge
        ? `Build on ${bridge.viaSkill} (${bridge.viaProficiency}%) with a hands-on ${gap.skill} deliverable to reach ${gap.required}%.`
        : `Take a focused ${gap.skill} learning track and apply it on one internal deliverable to reach ${gap.required}%.`,
      rationale: `${gap.roleTitle} requires ${gap.skill} at ${gap.required}%; current evidence supports ${gap.current}% (${distance} points to close).`,
      priority: index < 2 ? "high" : distance >= 40 ? "medium" : "low",
    };
  });
}

export function buildSkillAnalysis(
  skills: EmployeeSkill[],
  matches: MatchResult[],
  aiLearningActions?: LearningAction[] | null,
): SkillAnalysis {
  const declared = skills.filter((skill) => skill.source === "declared").sort(byProficiency);
  const discovered = skills
    .filter((skill) => skill.source !== "declared" && Boolean(skill.evidence))
    .sort(byProficiency);
  const hidden = skills.filter((skill) => skill.skill_type === "hidden").sort(byProficiency);
  const transferable = skills
    .filter((skill) => skill.skill_type === "transferable")
    .sort(byProficiency);

  const recommendedRoles = matches.slice(0, 5);
  const gapMap = new Map<string, SkillGap & { roleTitle: string }>();
  for (const match of matches.slice(0, 3)) {
    for (const gap of match.gaps) {
      const existing = gapMap.get(gap.skill);
      if (!existing || gap.required > existing.required) {
        gapMap.set(gap.skill, { ...gap, roleTitle: match.roleTitle });
      }
    }
  }
  const gaps = [...gapMap.values()].sort(
    (a, b) => b.required - b.current - (a.required - a.current),
  );

  const confidenceMix: Record<ConfidenceBand, number> = { high: 0, medium: 0, low: 0 };
  for (const skill of skills) confidenceMix[confidenceBand(skill.confidence).band] += 1;

  return {
    declared,
    discovered,
    hidden,
    transferable,
    recommendedRoles,
    gaps,
    learningActions:
      aiLearningActions && aiLearningActions.length > 0 ? aiLearningActions : deriveActions(gaps),
    confidenceMix,
  };
}
