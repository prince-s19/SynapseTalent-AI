export type SkillSource =
  | "declared"
  | "project"
  | "certification"
  | "github"
  | "portfolio"
  | "ai_inferred";

export type SkillType = "direct" | "hidden" | "transferable";

export interface Employee {
  id: string;
  name: string;
  /** Not read by the browser: employee email stays server/HR-side only. */
  email?: string | null;
  department: string;
  current_role: string;
  tenure_years: number;
  avatar_url: string | null;
  career_goal: string | null;
  career_goal_timeline: string | null;
  bio: string | null;
  certifications: string[];
  github_url?: string | null;
  linkedin_url?: string | null;
  slack_url?: string | null;
  portfolio_url?: string | null;
  website_url?: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

export interface EmployeeSkill {
  id: string;
  employee_id: string;
  skill_id: string;
  name: string;
  category: string;
  proficiency: number;
  confidence: number;
  source: SkillSource | string;
  evidence: string | null;
  skill_type: SkillType | string;
}

export interface Project {
  id: string;
  employee_id: string;
  name: string;
  description: string | null;
  tech_stack: string[];
  role: string | null;
  duration: string | null;
  evidence_url: string | null;
}

export interface SkillRequirement {
  skill: string;
  proficiency: number;
}

export interface Role {
  id: string;
  title: string;
  department: string;
  description: string | null;
  seniority: string | null;
  required_skills: SkillRequirement[];
  nice_to_have_skills: SkillRequirement[];
  responsibilities: string | null;
}

export interface MatchStrength {
  skill: string;
  proficiency: number;
  required: number;
  confidence: number;
  evidence: string | null;
  source: string;
  skillType: string;
}

export interface TransferableMatch {
  skill: string;
  required: number;
  viaSkill: string;
  viaProficiency: number;
  adjacencyConfidence: number;
  effectiveProficiency: number;
  evidence: string | null;
}

export interface SkillGap {
  skill: string;
  current: number;
  required: number;
  gap: number;
  closestTransferable: TransferableMatch | null;
}

export interface MatchResult {
  roleId: string;
  roleTitle: string;
  matchScore: number;
  semanticScore: number;
  skillCoverageScore: number;
  transferableScore: number;
  readiness: "Ready now" | "Ready in ~3 months" | "Developing" | "Early stage";
  strengths: MatchStrength[];
  transferables: TransferableMatch[];
  gaps: SkillGap[];
  recommendations: string[];
  confidence: number;
}

export interface RoadmapStep {
  month: number;
  skill: string;
  action: string;
  project?: string;
  outcome?: string;
}

export interface CareerRoadmap {
  steps: RoadmapStep[];
  estimatedMonths: number;
  summary?: string;
  source: "ai" | "deterministic";
}

export interface HiddenSkillCard {
  skill: string;
  proficiency: number;
  confidence: number;
  source: string;
  evidence: string;
  explanation: string;
  skillType: string;
}
