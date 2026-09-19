import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { buildSkillVector, scoreAllRoles } from "./matching";
import type { Employee, EmployeeSkill, MatchResult, Project, Role, SkillRequirement } from "./types";

export interface EmployeeContext {
  employee: Employee;
  skills: EmployeeSkill[];
  projects: Project[];
  roles: Role[];
  matches: MatchResult[];
  enrichment: Array<{ provider: string; target: string | null; summary: unknown }>;
  aiAnalysisEnabled: boolean;
}

export async function loadEmployeeContext(employeeId: string): Promise<EmployeeContext> {
  const [employeeRes, skillsRes, projectsRes, rolesRes, enrichmentRes, consentRes] =
    await Promise.all([
      supabaseAdmin
        .from("employees")
        .select(
          "id,name,email,department,current_role,tenure_years,avatar_url,career_goal,career_goal_timeline,bio,certifications",
        )
        .eq("id", employeeId)
        .maybeSingle(),
      supabaseAdmin
        .from("employee_skills")
        .select(
          "id,employee_id,skill_id,proficiency,confidence,source,evidence,skill_type,skills(name,category)",
        )
        .eq("employee_id", employeeId),
      supabaseAdmin
        .from("projects")
        .select("id,employee_id,name,description,tech_stack,role,duration,evidence_url")
        .eq("employee_id", employeeId),
      supabaseAdmin
        .from("roles")
        .select(
          "id,title,department,description,seniority,required_skills,nice_to_have_skills,responsibilities",
        ),
      supabaseAdmin
        .from("enrichment_runs")
        .select("provider,target,raw_summary,status")
        .eq("employee_id", employeeId)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(3),
      supabaseAdmin
        .from("consent_settings")
        .select("ai_analysis_enabled")
        .eq("employee_id", employeeId)
        .maybeSingle(),
    ]);

  if (employeeRes.error) throw new Error(employeeRes.error.message);
  if (!employeeRes.data) throw new Error("Employee not found in the demo environment.");

  const employee = employeeRes.data as unknown as Employee;
  const skillRows = (skillsRes.data ?? []) as unknown as Array<{
    id: string;
    employee_id: string;
    skill_id: string;
    skills: { name: string; category: string } | null;
    proficiency: number;
    confidence: number;
    source: string;
    evidence: string | null;
    skill_type: string;
  }>;
  const skills: EmployeeSkill[] = skillRows.map((row) => ({
    id: row.id,
    employee_id: row.employee_id,
    skill_id: row.skill_id,
    name: row.skills?.name ?? "Unknown skill",
    category: row.skills?.category ?? "General",
    proficiency: Number(row.proficiency),
    confidence: Number(row.confidence),
    source: row.source as EmployeeSkill["source"],
    evidence: row.evidence,
    skill_type: row.skill_type as EmployeeSkill["skill_type"],
  }));
  const projects = (projectsRes.data ?? []) as unknown as Project[];
  const roleRows = (rolesRes.data ?? []) as unknown as Array<
    Omit<Role, "required_skills" | "nice_to_have_skills"> & {
      required_skills: SkillRequirement[] | null;
      nice_to_have_skills: SkillRequirement[] | null;
    }
  >;
  const roles: Role[] = roleRows.map((row) => ({
    ...row,
    required_skills: row.required_skills ?? [],
    nice_to_have_skills: row.nice_to_have_skills ?? [],
  }));

  const matches = scoreAllRoles(buildSkillVector(skills), roles);

  const enrichmentRows = (enrichmentRes.data ?? []) as unknown as Array<{
    provider: string;
    target: string | null;
    raw_summary: unknown;
  }>;

  return {
    employee,
    skills,
    projects,
    roles,
    matches,
    enrichment: enrichmentRows.map((row) => ({
      provider: row.provider,
      target: row.target,
      summary: row.raw_summary,
    })),
    aiAnalysisEnabled: consentRes.data?.ai_analysis_enabled ?? true,
  };
}

/** Compact, evidence-only text block handed to the model. */
export function describeContext(context: EmployeeContext, includeMatches = true): string {
  const { employee, skills, projects, matches, enrichment } = context;
  const lines: string[] = [];
  lines.push(`EMPLOYEE: ${employee.name}`);
  lines.push(`CURRENT ROLE: ${employee.current_role} (${employee.department})`);
  lines.push(`TENURE: ${employee.tenure_years} years`);
  lines.push(`CAREER GOAL: ${employee.career_goal ?? "not stated"} (${employee.career_goal_timeline ?? "no timeline"})`);
  lines.push(`CERTIFICATIONS: ${employee.certifications?.join("; ") || "none recorded"}`);
  lines.push("");
  lines.push("DECLARED AND DISCOVERED SKILLS:");
  for (const skill of skills) {
    lines.push(
      `- ${skill.name}: proficiency ${skill.proficiency}%, confidence ${skill.confidence}%, source ${skill.source}, type ${skill.skill_type}, evidence: ${skill.evidence ?? "none recorded"}`,
    );
  }
  lines.push("");
  lines.push("PROJECTS:");
  for (const project of projects) {
    lines.push(
      `- ${project.name} (${project.role ?? "contributor"}, ${project.duration ?? "unknown duration"}): ${project.description ?? ""} [tech: ${project.tech_stack.join(", ")}]`,
    );
  }
  if (enrichment.length > 0) {
    lines.push("");
    lines.push("PUBLIC PROFILE ENRICHMENT (consented, public sources only):");
    for (const run of enrichment) {
      lines.push(`- ${run.provider} (${run.target ?? "unknown target"}): ${JSON.stringify(run.summary)}`);
    }
  }
  if (includeMatches) {
    lines.push("");
    lines.push("ROLE MATCHES (deterministic scoring engine):");
    for (const match of matches.slice(0, 6)) {
      lines.push(
        `- ${match.roleTitle}: ${match.matchScore}% (${match.readiness}). Gaps: ${
          match.gaps.map((gap) => `${gap.skill} ${gap.current}%→${gap.required}%`).join(", ") || "none"
        }`,
      );
    }
  }
  return lines.join("\n");
}
