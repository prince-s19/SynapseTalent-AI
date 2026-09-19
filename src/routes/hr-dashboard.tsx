import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Building2, Layers, Users } from "lucide-react";
import { useMemo } from "react";

import { AppPage } from "@/components/talent/page";
import {
  DisclosureNote,
  ErrorBlock,
  LoadingBlock,
  MetricCard,
  PageHeader,
  ProficiencyBar,
  SectionHeading,
} from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildSkillVector, scoreAllRoles } from "@/lib/talent/matching";
import { allEmployeeSkillsQuery, employeesQuery, rolesQuery } from "@/lib/talent/queries";
import type { EmployeeSkill } from "@/lib/talent/types";

export const Route = createFileRoute("/hr-dashboard")({
  head: () => ({
    meta: [
      { title: "HR Talent Insights (Demo) — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Simulated organisation view: talent overview, skill heatmap, hidden talent alerts and internal mobility insights.",
      },
      { property: "og:title", content: "HR Talent Insights (Demo) — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Projected, clearly-labelled demo metrics across a fictional organisation.",
      },
    ],
  }),
  component: HrDashboardPage,
});

function HrDashboardPage() {
  const employees = useQuery(employeesQuery());
  const roles = useQuery(rolesQuery());
  const allSkills = useQuery(allEmployeeSkillsQuery());

  const byEmployee = useMemo(() => {
    const map = new Map<string, EmployeeSkill[]>();
    for (const skill of allSkills.data ?? []) {
      const list = map.get(skill.employee_id) ?? [];
      list.push(skill);
      map.set(skill.employee_id, list);
    }
    return map;
  }, [allSkills.data]);

  const alerts = useMemo(() => {
    if (!employees.data || !roles.data) return [];
    return employees.data
      .map((employee) => {
        const skills = byEmployee.get(employee.id) ?? [];
        if (skills.length === 0) return null;
        const matches = scoreAllRoles(buildSkillVector(skills), roles.data);
        const best = matches[0];
        if (!best) return null;
        const crossDepartment = roles.data.find((role) => role.id === best.roleId)?.department;
        return { employee, best, crossDepartment };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.crossDepartment !== item.employee.department && item.best.matchScore >= 65)
      .sort((a, b) => b.best.matchScore - a.best.matchScore)
      .slice(0, 6);
  }, [employees.data, roles.data, byEmployee]);

  const orgGaps = useMemo(() => {
    if (!roles.data) return [];
    const required = new Map<string, number>();
    for (const role of roles.data) {
      for (const requirement of role.required_skills) {
        required.set(requirement.skill, (required.get(requirement.skill) ?? 0) + 1);
      }
    }
    const supply = new Map<string, number>();
    for (const skill of allSkills.data ?? []) {
      if (skill.proficiency >= 60) supply.set(skill.name, (supply.get(skill.name) ?? 0) + 1);
    }
    return [...required.entries()]
      .map(([skill, demand]) => ({
        skill,
        demand,
        supply: supply.get(skill) ?? 0,
        coverage: Math.min(100, Math.round(((supply.get(skill) ?? 0) / Math.max(1, demand * 3)) * 100)),
      }))
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, 6);
  }, [roles.data, allSkills.data]);

  const heatmapSkills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const skill of allSkills.data ?? []) {
      counts.set(skill.name, (counts.get(skill.name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill]) => skill);
  }, [allSkills.data]);

  const isLoading = employees.isLoading || roles.isLoading || allSkills.isLoading;
  const isError = employees.isError || roles.isError || allSkills.isError;

  return (
    <AppPage>
      <PageHeader
        eyebrow="HR Talent Insights"
        title="Organisation view (DEMO / PROJECTED)"
        description="Every number on this page is simulated from fictional demo data. Nothing here represents a real organisation."
      >
        <Badge variant="outline" className="rounded-full border-warning/50 text-warning-foreground">
          DEMO / PROJECTED
        </Badge>
      </PageHeader>

      {isLoading ? (
        <LoadingBlock rows={5} />
      ) : isError ? (
        <ErrorBlock
          message="Organisation insights could not be loaded."
          onRetry={() => {
            void employees.refetch();
            void roles.refetch();
            void allSkills.refetch();
          }}
        />
      ) : (
        <div className="space-y-10">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Employees (demo)"
              value={String(employees.data?.length ?? 0)}
              sublabel="Fictional profiles"
              icon={Users}
            />
            <MetricCard
              label="Internal roles"
              value={String(roles.data?.length ?? 0)}
              sublabel="Open demo opportunities"
              icon={Building2}
              tone="accent"
            />
            <MetricCard
              label="Skills tracked"
              value={String(new Set((allSkills.data ?? []).map((skill) => skill.name)).size)}
              sublabel="Across all profiles"
              icon={Layers}
            />
            <MetricCard
              label="Hidden talent alerts"
              value={String(alerts.length)}
              sublabel="Cross-department potential"
              icon={AlertTriangle}
              tone="success"
            />
          </section>

          <section>
            <SectionHeading
              title="Hidden talent alerts"
              description="Employees whose strongest projected match sits outside their current department."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {alerts.map((alert) => (
                <Card key={alert.employee.id} className="surface-card hover-lift border-accent/25">
                  <CardContent className="space-y-2 p-5">
                    <p className="font-display text-base font-semibold">{alert.employee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.employee.current_role} · {alert.employee.department}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-medium">{alert.best.roleTitle}</span>
                      <Badge className="rounded-full border-transparent bg-accent text-accent-foreground">
                        {alert.best.matchScore}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Projected readiness · {alert.best.readiness}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No cross-department alerts in the current demo dataset.
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <SectionHeading
              title="Organisation skill gaps (projected)"
              description="Where demand from internal roles outpaces demonstrated proficiency across the demo population."
            />
            <Card className="surface-card">
              <CardContent className="grid gap-5 p-6 md:grid-cols-2">
                {orgGaps.map((gap) => (
                  <div key={gap.skill}>
                    <ProficiencyBar label={gap.skill} value={gap.coverage} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Required by {gap.demand} roles · {gap.supply} people at 60%+ proficiency
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeading
              title="Skill heatmap"
              description="Demonstrated proficiency per employee across the most common demo skills."
            />
            <Card className="surface-card overflow-x-auto">
              <CardContent className="p-4">
                <table className="w-full min-w-[720px] border-separate border-spacing-1 text-xs">
                  <caption className="sr-only">
                    Skill heatmap of demo employees and their proficiency
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="px-2 py-1 text-left font-medium text-muted-foreground">
                        Employee
                      </th>
                      {heatmapSkills.map((skill) => (
                        <th
                          key={skill}
                          scope="col"
                          className="px-2 py-1 text-left font-medium text-muted-foreground"
                        >
                          {skill}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(employees.data ?? []).slice(0, 14).map((employee) => {
                      const skills = byEmployee.get(employee.id) ?? [];
                      return (
                        <tr key={employee.id}>
                          <th scope="row" className="px-2 py-1 text-left font-medium">
                            {employee.name}
                          </th>
                          {heatmapSkills.map((skillName) => {
                            const value =
                              skills.find((skill) => skill.name === skillName)?.proficiency ?? 0;
                            return (
                              <td key={skillName} className="px-1 py-1">
                                <span
                                  className="block h-7 rounded-md"
                                  style={{
                                    backgroundColor: `oklch(0.55 0.245 297 / ${Math.max(0.05, value / 130)})`,
                                  }}
                                  title={`${employee.name} · ${skillName}: ${Math.round(value)}%`}
                                  aria-label={`${employee.name}, ${skillName}, ${Math.round(value)} percent`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          <DisclosureNote>
            All metrics are simulated demo values derived from fictional employees. They must not be
            read as real company data or used for employment decisions.
          </DisclosureNote>
        </div>
      )}
    </AppPage>
  );
}
