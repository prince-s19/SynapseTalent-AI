import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  CareerRoadmap,
  Employee,
  EmployeeSkill,
  Project,
  Role,
  Skill,
  SkillRequirement,
} from "./types";

export const HERO_EMPLOYEE_ID = "e0000000-0000-4000-8000-000000000001";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export const employeesQuery = () =>
  queryOptions({
    queryKey: ["employees"],
    queryFn: async (): Promise<Employee[]> => {
      const rows = unwrap(
        await supabase
          .from("employees")
          .select(
            "id,name,department,current_role,tenure_years,avatar_url,career_goal,career_goal_timeline,bio,certifications,github_url,linkedin_url,slack_url,portfolio_url,website_url",
          )
          .order("name"),
      );
      return rows as unknown as Employee[];
    },
    staleTime: 60_000,
  });

export const skillsQuery = () =>
  queryOptions({
    queryKey: ["skills"],
    queryFn: async (): Promise<Skill[]> => {
      const rows = unwrap(
        await supabase.from("skills").select("id,name,category,description").order("name"),
      );
      return rows as unknown as Skill[];
    },
    staleTime: 5 * 60_000,
  });

export const rolesQuery = () =>
  queryOptions({
    queryKey: ["roles"],
    queryFn: async (): Promise<Role[]> => {
      const rows = unwrap(
        await supabase
          .from("roles")
          .select(
            "id,title,department,description,seniority,required_skills,nice_to_have_skills,responsibilities",
          )
          .order("title"),
      );
      return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        required_skills: (row['required_skills'] ?? []) as SkillRequirement[],
        nice_to_have_skills: (row['nice_to_have_skills'] ?? []) as SkillRequirement[],
      })) as Role[];
    },
    staleTime: 5 * 60_000,
  });

export const employeeSkillsQuery = (employeeId: string) =>
  queryOptions({
    queryKey: ["employee-skills", employeeId],
    queryFn: async (): Promise<EmployeeSkill[]> => {
      const rows = unwrap(
        await supabase
          .from("employee_skills")
          .select(
            "id,employee_id,skill_id,proficiency,confidence,source,evidence,skill_type,skills(name,category)",
          )
          .eq("employee_id", employeeId),
      );
      return (rows as unknown as Array<Record<string, any>>).map((row) => ({
        id: row['id'],
        employee_id: row['employee_id'],
        skill_id: row['skill_id'],
        name: row['skills']?.name ?? "Unknown skill",
        category: row['skills']?.category ?? "General",
        proficiency: Number(row['proficiency']),
        confidence: Number(row['confidence']),
        source: row['source'],
        evidence: row['evidence'],
        skill_type: row['skill_type'],
      }));
    },
    staleTime: 15_000,
  });

export const allEmployeeSkillsQuery = () =>
  queryOptions({
    queryKey: ["employee-skills", "all"],
    queryFn: async (): Promise<EmployeeSkill[]> => {
      const rows = unwrap(
        await supabase
          .from("employee_skills")
          .select(
            "id,employee_id,skill_id,proficiency,confidence,source,evidence,skill_type,skills(name,category)",
          ),
      );
      return (rows as unknown as Array<Record<string, any>>).map((row) => ({
        id: row['id'],
        employee_id: row['employee_id'],
        skill_id: row['skill_id'],
        name: row['skills']?.name ?? "Unknown skill",
        category: row['skills']?.category ?? "General",
        proficiency: Number(row['proficiency']),
        confidence: Number(row['confidence']),
        source: row['source'],
        evidence: row['evidence'],
        skill_type: row['skill_type'],
      }));
    },
    staleTime: 60_000,
  });

export const projectsQuery = (employeeId: string) =>
  queryOptions({
    queryKey: ["projects", employeeId],
    queryFn: async (): Promise<Project[]> => {
      const rows = unwrap(
        await supabase
          .from("projects")
          .select("id,employee_id,name,description,tech_stack,role,duration,evidence_url")
          .eq("employee_id", employeeId)
          .order("created_at"),
      );
      return rows as unknown as Project[];
    },
    staleTime: 60_000,
  });

export const allProjectsQuery = () =>
  queryOptions({
    queryKey: ["projects", "all"],
    queryFn: async (): Promise<Project[]> => {
      const rows = unwrap(
        await supabase
          .from("projects")
          .select("id,employee_id,name,description,tech_stack,role,duration,evidence_url"),
      );
      return rows as unknown as Project[];
    },
    staleTime: 60_000,
  });

export const consentQuery = (employeeId: string) =>
  queryOptions({
    queryKey: ["consent", employeeId],
    queryFn: async () => {
      const result = await supabase
        .from("consent_settings")
        .select(
          "id,employee_id,github_enabled,portfolio_enabled,public_web_enabled,ai_analysis_enabled",
        )
        .eq("employee_id", employeeId)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 10_000,
  });

export const enrichmentRunsQuery = (employeeId: string) =>
  queryOptions({
    queryKey: ["enrichment-runs", employeeId],
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from("enrichment_runs")
          .select("id,provider,target,status,raw_summary,created_at")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
          .limit(5),
      );
      return rows as unknown as Array<{
        id: string;
        provider: string;
        target: string | null;
        status: string;
        raw_summary: Record<string, unknown> | null;
        created_at: string;
      }>;
    },
    staleTime: 5_000,
  });

export const roadmapQuery = (employeeId: string, roleId: string) =>
  queryOptions({
    queryKey: ["roadmap", employeeId, roleId],
    queryFn: async (): Promise<CareerRoadmap | null> => {
      const result = await supabase
        .from("career_roadmaps")
        .select("roadmap,estimated_months")
        .eq("employee_id", employeeId)
        .eq("target_role_id", roleId)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      if (!result.data) return null;
      const stored = result.data.roadmap as unknown as CareerRoadmap;
      return { ...stored, estimatedMonths: result.data.estimated_months };
    },
    staleTime: 5_000,
  });

/* ---------------- HR workflow, rewards and reports ---------------- */

export interface RecognitionRow {
  id: string;
  employee_id: string;
  badge: string;
  message: string | null;
  created_at: string;
}

export const recognitionsQuery = (employeeId: string) =>
  queryOptions({
    queryKey: ["recognitions", employeeId],
    queryFn: async (): Promise<RecognitionRow[]> => {
      const rows = unwrap(
        await supabase
          .from("recognitions")
          .select("id,employee_id,badge,message,created_at")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false }),
      );
      return rows as unknown as RecognitionRow[];
    },
    staleTime: 10_000,
  });

export interface HrReportRow {
  id: string;
  employee_id: string;
  title: string;
  summary: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export const hrReportsQuery = (employeeId: string) =>
  queryOptions({
    queryKey: ["hr-reports", employeeId],
    queryFn: async (): Promise<HrReportRow[]> => {
      const rows = unwrap(
        await supabase
          .from("hr_reports")
          .select("id,employee_id,title,summary,payload,created_at")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false }),
      );
      return rows as unknown as HrReportRow[];
    },
    staleTime: 10_000,
  });

export interface MobilityMessageRow {
  id: string;
  candidate_id: string;
  subject: string;
  body: string;
  response: string | null;
  response_note: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface PipelineCandidateRow {
  id: string;
  employee_id: string;
  role_id: string | null;
  stage: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  messages: MobilityMessageRow[];
}

/** Pipeline rows visible to the caller (HR sees all, an employee sees their own). */
export const pipelineQuery = () =>
  queryOptions({
    queryKey: ["pipeline"],
    queryFn: async (): Promise<PipelineCandidateRow[]> => {
      const rows = unwrap(
        await supabase
          .from("pipeline_candidates")
          .select(
            "id,employee_id,role_id,stage,notes,created_at,updated_at,mobility_messages(id,candidate_id,subject,body,response,response_note,responded_at,created_at)",
          )
          .order("updated_at", { ascending: false }),
      );
      return (rows as unknown as Array<Record<string, any>>).map((row) => ({
        id: row['id'],
        employee_id: row['employee_id'],
        role_id: row['role_id'],
        stage: row['stage'],
        notes: row['notes'],
        created_at: row['created_at'],
        updated_at: row['updated_at'],
        messages: ((row['mobility_messages'] ?? []) as MobilityMessageRow[]).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      }));
    },
    staleTime: 5_000,
  });

export interface ProfileAnalysisRow {
  id: string;
  employee_id: string;
  analysis: Record<string, unknown> | null;
  sources: unknown;
  created_at: string;
}

/** HR-only: the latest link-based analysis stored for an employee. */
export const profileAnalysisQuery = (employeeId: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["profile-analysis", employeeId],
    enabled,
    queryFn: async (): Promise<ProfileAnalysisRow | null> => {
      const result = await supabase
        .from("profile_analyses")
        .select("id,employee_id,analysis,sources,created_at")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return (result.data as unknown as ProfileAnalysisRow | null) ?? null;
    },
    staleTime: 5_000,
  });
