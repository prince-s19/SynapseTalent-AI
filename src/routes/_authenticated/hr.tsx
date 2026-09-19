import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  ScanSearch,
  Search,
  Users,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";

import { HrCandidatePanel } from "@/components/talent/hr-candidate";
import { PipelineBoard } from "@/components/talent/hr-pipeline";
import { AppPage } from "@/components/talent/page";
import {
  DisclosureNote,
  LoadingBlock,
  MetricCard,
  PageHeader,
  ReadinessBadge,
  SectionHeading,
} from "@/components/talent/primitives";
import { ProfileAvatar, ProfileLinkIcons } from "@/components/talent/profile-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/lib/auth/account";
import { buildSkillVector, scoreAllRoles } from "@/lib/talent/matching";
import { allEmployeeSkillsQuery, employeesQuery, rolesQuery } from "@/lib/talent/queries";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({
    meta: [
      { title: "HR Workspace — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "HR-only workspace: every talent profile, strongest internal match per person and hidden-talent alerts across the organisation.",
      },
      { property: "og:title", content: "HR Workspace — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Organisation-wide talent intelligence for HR teams.",
      },
    ],
  }),
  component: HrWorkspacePage,
});

function HrWorkspacePage() {
  const account = useAccount();
  const employees = useQuery(employeesQuery());
  const roles = useQuery(rolesQuery());
  const allSkills = useQuery(allEmployeeSkillsQuery());
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = (employees.data ?? []).find((item) => item.id === selectedId) ?? null;

  const rows = useMemo(() => {
    if (!employees.data || !roles.data || !allSkills.data) return [];
    return employees.data.map((employee) => {
      const skills = allSkills.data.filter((skill) => skill.employee_id === employee.id);
      const matches = scoreAllRoles(buildSkillVector(skills), roles.data);
      const hidden = skills.filter((skill) => skill.skill_type !== "direct").length;
      return { employee, best: matches[0] ?? null, hidden, skillCount: skills.length };
    });
  }, [employees.data, roles.data, allSkills.data]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? rows.filter(
          (row) =>
            row.employee.name.toLowerCase().includes(needle) ||
            row.employee.department.toLowerCase().includes(needle) ||
            row.employee.current_role.toLowerCase().includes(needle),
        )
      : rows;
    return [...list].sort((a, b) => (b.best?.matchScore ?? 0) - (a.best?.matchScore ?? 0));
  }, [rows, query]);

  if (account.isLoading) {
    return (
      <AppPage>
        <LoadingBlock rows={3} />
      </AppPage>
    );
  }

  if (!account.isHr) {
    return (
      <AppPage>
        <PageHeader
          eyebrow="Restricted"
          title="HR workspace"
          description="This workspace is only available to HR accounts."
        />
        <Card className="surface-card max-w-xl">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <p className="text-sm text-muted-foreground">
              Your account is an employee account. Open your own analysis instead.
            </p>
            <Button asChild>
              <Link to="/me">My analysis</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPage>
    );
  }

  const alerts = filtered
    .filter((row) => (row.best?.matchScore ?? 0) >= 70 && row.hidden > 0)
    .slice(0, 6);

  return (
    <AppPage>
      <PageHeader
        eyebrow="HR workspace"
        title="Organisation talent intelligence"
        description="Every talent profile with its strongest internal match. Demo data and projected figures only."
      >
        <Button asChild variant="outline">
          <Link to="/hr-dashboard">
            <BarChart3 className="size-4" aria-hidden /> Talent insights
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Talent profiles" value={String(rows.length)} icon={Users} />
        <MetricCard
          label="Hidden skills surfaced"
          value={String(rows.reduce((sum, row) => sum + row.hidden, 0))}
          icon={BrainCircuit}
          tone="accent"
        />
        <MetricCard
          label="Ready-now candidates"
          value={String(rows.filter((row) => row.best?.readiness === "Ready now").length)}
          icon={BarChart3}
          tone="success"
        />
      </div>

      <section className="mt-10">
        <SectionHeading
          title="Hidden talent alerts"
          description="People whose discovered skills point to a strong internal match outside their current title."
        />
        {alerts.length === 0 ? (
          <Card className="surface-card">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No alerts yet. Run skill analysis on a profile to surface hidden capability.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((row) => (
              <Card key={row.employee.id} className="surface-card hover-lift">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{row.employee.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {row.employee.current_role} · {row.employee.department}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    <span className="font-display text-2xl font-semibold brand-gradient-text">
                      {Math.round(row.best!.matchScore)}%
                    </span>{" "}
                    match for {row.best!.roleTitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReadinessBadge readiness={row.best!.readiness} />
                    <Badge variant="secondary" className="rounded-full text-[11px]">
                      {row.hidden} hidden / transferable
                    </Badge>
                  </div>
                  <Link
                    to="/employee/$employeeId"
                    params={{ employeeId: row.employee.id }}
                    className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-primary"
                  >
                    Open analysis <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Candidate pipeline"
          icon={Workflow}
          description="Internal mobility tracking: identified, contacted, responded, interviewing, placed."
        />
        <PipelineBoard />
      </section>

      {selected ? (
        <section className="mt-10">
          <SectionHeading
            title={`Candidate workspace — ${selected.name}`}
            icon={ScanSearch}
            description="Analyse the employee's own public profile links, recognise their work, share a report or add them to the pipeline."
            action={
              <Button type="button" variant="ghost" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            }
          />
          <HrCandidatePanel employee={selected} roles={roles.data ?? []} />
        </section>
      ) : null}

      <section className="mt-10">
        <SectionHeading
          title="All talent profiles"
          action={
            <div className="relative w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, role, department"
                aria-label="Search talent profiles"
                className="pl-9"
              />
            </div>
          }
        />

        <Card className="surface-card overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border/70">
              {filtered.map((row) => (
                <div
                  key={row.employee.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProfileAvatar employee={row.employee} size={40} className="rounded-xl" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.employee.current_role} · {row.employee.department} · {row.skillCount}{" "}
                        skills
                      </p>
                      <div className="mt-1.5">
                        <ProfileLinkIcons employee={row.employee} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {row.best ? (
                      <>
                        <span className="text-sm text-muted-foreground">{row.best.roleTitle}</span>
                        <Badge
                          variant="outline"
                          className="rounded-full border-accent/40 text-accent"
                        >
                          {Math.round(row.best.matchScore)}%
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="secondary" className="rounded-full">
                        No analysis yet
                      </Badge>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedId === row.employee.id ? "default" : "outline"}
                      onClick={() => setSelectedId(row.employee.id)}
                    >
                      Open workspace
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/employee/$employeeId" params={{ employeeId: row.employee.id }}>
                        Full analysis
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No profiles match that search.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <div className="mt-3">
          <DisclosureNote>
            Demo environment: fictional employees plus any accounts created in this build. All
            figures are projected, not real HR records.
          </DisclosureNote>
        </div>
      </section>
    </AppPage>
  );
}
