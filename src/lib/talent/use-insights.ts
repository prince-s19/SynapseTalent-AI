import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { buildSkillVector, careerReadiness, scoreAllRoles } from "./matching";
import {
  consentQuery,
  employeeSkillsQuery,
  employeesQuery,
  enrichmentRunsQuery,
  projectsQuery,
  rolesQuery,
} from "./queries";
import type { EmployeeSkill, MatchResult } from "./types";

export function useEmployeeInsights(employeeId: string) {
  const employees = useQuery(employeesQuery());
  const roles = useQuery(rolesQuery());
  const skills = useQuery(employeeSkillsQuery(employeeId));
  const projects = useQuery(projectsQuery(employeeId));
  const consent = useQuery(consentQuery(employeeId));
  const enrichment = useQuery(enrichmentRunsQuery(employeeId));

  const employee = useMemo(
    () => (employees.data ?? []).find((item) => item.id === employeeId) ?? null,
    [employees.data, employeeId],
  );

  const matches = useMemo<MatchResult[]>(() => {
    if (!skills.data || !roles.data) return [];
    return scoreAllRoles(buildSkillVector(skills.data), roles.data);
  }, [skills.data, roles.data]);

  const targetRole = useMemo(() => {
    if (!employee || !roles.data) return null;
    const goal = employee.career_goal?.trim().toLowerCase() ?? "";
    if (!goal) return null;
    return (
      roles.data.find((role) => goal.includes(role.title.toLowerCase())) ??
      roles.data.find((role) => role.title.toLowerCase().includes(goal)) ??
      null
    );
  }, [employee, roles.data]);


  const targetMatch = useMemo(
    () => matches.find((match) => match.roleId === targetRole?.id) ?? matches[0] ?? null,
    [matches, targetRole],
  );

  const hiddenSkills = useMemo<EmployeeSkill[]>(
    () =>
      (skills.data ?? [])
        .filter((skill) => skill.skill_type !== "direct" && Boolean(skill.evidence))
        .sort((a, b) => b.confidence - a.confidence),
    [skills.data],
  );

  return {
    employee,
    roles: roles.data ?? [],
    skills: skills.data ?? [],
    projects: projects.data ?? [],
    consent: consent.data ?? null,
    enrichmentRuns: enrichment.data ?? [],
    matches,
    targetRole,
    targetMatch,
    hiddenSkills,
    readiness: careerReadiness(matches),
    isLoading: employees.isLoading || roles.isLoading || skills.isLoading,
    isError: employees.isError || roles.isError || skills.isError,
    error: employees.error ?? roles.error ?? skills.error,
    refetch: () => {
      void employees.refetch();
      void roles.refetch();
      void skills.refetch();
      void projects.refetch();
    },
    refetchSkills: () => {
      void skills.refetch();
    },
  };
}
