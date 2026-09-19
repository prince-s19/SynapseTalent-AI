import { TRANSFERS_INTO, TRANSFER_DISCOUNT } from "./adjacency";
import type {
  EmployeeSkill,
  MatchResult,
  MatchStrength,
  Role,
  SkillGap,
  SkillRequirement,
  TransferableMatch,
} from "./types";

/**
 * Deterministic, transparent hybrid scoring engine.
 *
 *   match_score = 0.60 * semantic_score
 *               + 0.30 * skill_coverage_score
 *               + 0.10 * transferable_bonus
 *
 * No randomness, no trained model: the same inputs always produce the same
 * score. This is labelled in the UI as an evidence-based AI explanation, not
 * as SHAP or graph-neural-network output.
 */

export interface SkillVectorEntry {
  proficiency: number;
  confidence: number;
  evidence: string | null;
  source: string;
  skillType: string;
}

export type SkillVector = Map<string, SkillVectorEntry>;

export function buildSkillVector(skills: EmployeeSkill[]): SkillVector {
  const vector: SkillVector = new Map();
  for (const skill of skills) {
    const existing = vector.get(skill.name);
    if (existing && existing.proficiency >= skill.proficiency) continue;
    vector.set(skill.name, {
      proficiency: Number(skill.proficiency),
      confidence: Number(skill.confidence),
      evidence: skill.evidence,
      source: skill.source,
      skillType: skill.skill_type,
    });
  }
  return vector;
}

/** Apply simulated ("what if I learn X") skills on top of a real vector. */
export function withSimulatedSkills(
  vector: SkillVector,
  simulated: Array<{ skill: string; proficiency: number }>,
): SkillVector {
  const next: SkillVector = new Map(vector);
  for (const item of simulated) {
    const current = next.get(item.skill);
    if (current && current.proficiency >= item.proficiency) continue;
    next.set(item.skill, {
      proficiency: item.proficiency,
      confidence: 70,
      evidence: "Projected skill selected in the Career Simulator",
      source: "simulated",
      skillType: "direct",
    });
  }
  return next;
}

function bestTransfer(
  vector: SkillVector,
  target: string,
  required: number,
): TransferableMatch | null {
  const edges = TRANSFERS_INTO[target];
  if (!edges) return null;
  let best: TransferableMatch | null = null;
  for (const edge of edges) {
    const owned = vector.get(edge.from);
    if (!owned || owned.proficiency <= 0) continue;
    const effective = owned.proficiency * edge.confidence * TRANSFER_DISCOUNT;
    if (!best || effective > best.effectiveProficiency) {
      best = {
        skill: target,
        required,
        viaSkill: edge.from,
        viaProficiency: Math.round(owned.proficiency),
        adjacencyConfidence: edge.confidence,
        effectiveProficiency: Math.round(effective),
        evidence: owned.evidence,
      };
    }
  }
  return best;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Partial credit for demonstrated proficiency below the requirement. */
function coverageRatio(proficiency: number, required: number) {
  if (required <= 0) return 1;
  return clamp01(Math.sqrt(clamp01(proficiency / required)));
}

function readinessOf(score: number): MatchResult["readiness"] {
  if (score >= 85) return "Ready now";
  if (score >= 72) return "Ready in ~3 months";
  if (score >= 55) return "Developing";
  return "Early stage";
}

function recommendationFor(gap: SkillGap): string {
  const { skill, closestTransferable } = gap;
  if (closestTransferable) {
    return `Build on your ${closestTransferable.viaSkill} experience to reach the required ${skill} level — take an internal project where ${skill} is the core deliverable.`;
  }
  return `Start ${skill} from fundamentals, then apply it on a scoped internal project so the skill has evidence behind it.`;
}

export function scoreRole(vector: SkillVector, role: Role): MatchResult {
  const required: SkillRequirement[] = role.required_skills ?? [];
  const nice: SkillRequirement[] = role.nice_to_have_skills ?? [];

  const strengths: MatchStrength[] = [];
  const transferables: TransferableMatch[] = [];
  const gaps: SkillGap[] = [];

  // --- semantic score: cosine similarity between the employee's effective
  // proficiency vector and the role's requirement vector (required + nice).
  let dot = 0;
  let employeeNorm = 0;
  let roleNorm = 0;

  const evaluate = (req: SkillRequirement, weight: number) => {
    const owned = vector.get(req.skill);
    const transfer = bestTransfer(vector, req.skill, req.proficiency);
    const directProficiency = owned?.proficiency ?? 0;
    const effective = Math.max(directProficiency, transfer?.effectiveProficiency ?? 0);

    const e = (effective / 100) * weight;
    const r = (req.proficiency / 100) * weight;
    dot += e * r;
    employeeNorm += e * e;
    roleNorm += r * r;

    return { owned, transfer, directProficiency, effective };
  };

  let coverageSum = 0;
  let transferBonusSum = 0;
  let transferBonusCount = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const req of required) {
    const { owned, transfer, directProficiency } = evaluate(req, 1);
    coverageSum += coverageRatio(directProficiency, req.proficiency);

    if (owned) {
      confidenceSum += owned.confidence;
      confidenceCount += 1;
    }

    if (owned && directProficiency >= req.proficiency) {
      strengths.push({
        skill: req.skill,
        proficiency: Math.round(directProficiency),
        required: req.proficiency,
        confidence: Math.round(owned.confidence),
        evidence: owned.evidence,
        source: owned.source,
        skillType: owned.skillType,
      });
    } else {
      if (owned && directProficiency >= req.proficiency * 0.75) {
        strengths.push({
          skill: req.skill,
          proficiency: Math.round(directProficiency),
          required: req.proficiency,
          confidence: Math.round(owned.confidence),
          evidence: owned.evidence,
          source: owned.source,
          skillType: owned.skillType,
        });
      }
      gaps.push({
        skill: req.skill,
        current: Math.round(directProficiency),
        required: req.proficiency,
        gap: Math.max(0, req.proficiency - Math.round(directProficiency)),
        closestTransferable: transfer,
      });
      if (transfer) {
        transferBonusSum +=
          transfer.adjacencyConfidence * clamp01(transfer.effectiveProficiency / req.proficiency);
        transferBonusCount += 1;
        transferables.push(transfer);
      } else {
        transferBonusCount += 1;
      }
    }
  }

  for (const req of nice) {
    const { owned, transfer, directProficiency } = evaluate(req, 0.5);
    if (owned && directProficiency >= req.proficiency) {
      strengths.push({
        skill: req.skill,
        proficiency: Math.round(directProficiency),
        required: req.proficiency,
        confidence: Math.round(owned.confidence),
        evidence: owned.evidence,
        source: owned.source,
        skillType: owned.skillType,
      });
    } else if (!owned && transfer && transfer.effectiveProficiency > 0) {
      transferables.push(transfer);
    }
  }

  const semanticScore =
    employeeNorm > 0 && roleNorm > 0 ? dot / (Math.sqrt(employeeNorm) * Math.sqrt(roleNorm)) : 0;
  const skillCoverageScore = required.length > 0 ? coverageSum / required.length : 0;
  const transferableScore = transferBonusCount > 0 ? transferBonusSum / transferBonusCount : 0;

  const combined =
    0.6 * clamp01(semanticScore) + 0.3 * clamp01(skillCoverageScore) + 0.1 * clamp01(transferableScore);
  const matchScore = Math.round(combined * 100);

  strengths.sort(
    (a, b) => b.proficiency * b.required - a.proficiency * a.required || b.proficiency - a.proficiency,
  );
  gaps.sort((a, b) => b.gap - a.gap);
  transferables.sort((a, b) => b.effectiveProficiency - a.effectiveProficiency);

  const seenTransfer = new Set<string>();
  const uniqueTransferables = transferables.filter((item) => {
    if (seenTransfer.has(item.skill)) return false;
    seenTransfer.add(item.skill);
    return true;
  });

  return {
    roleId: role.id,
    roleTitle: role.title,
    matchScore,
    semanticScore: Math.round(clamp01(semanticScore) * 100),
    skillCoverageScore: Math.round(clamp01(skillCoverageScore) * 100),
    transferableScore: Math.round(clamp01(transferableScore) * 100),
    readiness: readinessOf(matchScore),
    strengths,
    transferables: uniqueTransferables,
    gaps,
    recommendations: gaps.slice(0, 3).map(recommendationFor),
    confidence: confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : 0,
  };
}

export function scoreAllRoles(vector: SkillVector, roles: Role[]): MatchResult[] {
  return roles
    .map((role) => scoreRole(vector, role))
    .sort((a, b) => b.matchScore - a.matchScore || a.roleTitle.localeCompare(b.roleTitle));
}

/** Overall career readiness against the employee's best-matching role. */
export function careerReadiness(matches: MatchResult[]): number {
  if (matches.length === 0) return 0;
  return matches[0]?.matchScore ?? 0;
}

export function buildRoadmapFallback(match: MatchResult, targetRoleTitle: string) {
  const steps = match.gaps.slice(0, 4).map((gap, index) => ({
    month: index + 1,
    skill: gap.skill,
    action: gap.closestTransferable
      ? `Complete ${gap.skill} fundamentals, leaning on your ${gap.closestTransferable.viaSkill} experience`
      : `Complete ${gap.skill} fundamentals`,
    project: `Apply ${gap.skill} on a scoped internal project so the skill has evidence`,
    outcome: `${gap.skill} raised from ${gap.current}% towards the required ${gap.required}%`,
  }));
  steps.push({
    month: steps.length + 1,
    skill: "Internal opportunity readiness review",
    action: `Readiness review for ${targetRoleTitle} with your manager and the hiring team`,
    project: "Present the evidence built across the roadmap",
    outcome: "Formal internal readiness decision",
  });
  return {
    steps,
    estimatedMonths: steps.length,
    summary: `Roadmap built from the ${match.gaps.length} skill gaps identified for ${targetRoleTitle}.`,
    source: "deterministic" as const,
  };
}
