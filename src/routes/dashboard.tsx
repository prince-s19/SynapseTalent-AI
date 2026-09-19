import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Brain,
  Briefcase,
  Compass,
  FlaskConical,
  Gauge,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { SkillRadar } from "@/components/talent/charts";
import { AppPage } from "@/components/talent/page";
import {
  DisclosureNote,
  ErrorBlock,
  LoadingBlock,
  MetricCard,
  SectionHeading,
} from "@/components/talent/primitives";
import {
  AnalyzeSkillsButton,
  HiddenSkillsGrid,
  RoleMatchCard,
  toHiddenCards,
} from "@/components/talent/sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppState } from "@/lib/talent/app-state";
import { buildSkillVector } from "@/lib/talent/matching";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Talent Dashboard — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Hidden skill discovery, recommended internal roles and career readiness for the selected employee.",
      },
      { property: "og:title", content: "Talent Dashboard — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Your skills are more than your job title: discovered skills, matches and gaps.",
      },
    ],
  }),
  component: DashboardPage,
});

const HIDDEN_BADGES = [
  { label: "Systems Thinker", icon: Brain },
  { label: "AI Explorer", icon: Sparkles },
  { label: "Technical Mentor", icon: Award },
  { label: "Problem Solver", icon: Gauge },
];

function DashboardPage() {
  const { employeeId } = useAppState();
  const insights = useEmployeeInsights(employeeId);

  if (insights.isLoading) {
    return (
      <AppPage>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="mt-8">
          <LoadingBlock rows={3} />
        </div>
      </AppPage>
    );
  }

  if (insights.isError || !insights.employee) {
    return (
      <AppPage>
        <ErrorBlock
          message="We couldn't load this profile from the demo environment."
          onRetry={insights.refetch}
        />
      </AppPage>
    );
  }

  const { employee, skills, matches, targetRole, targetMatch } = insights;
  const hidden = toHiddenCards(skills);
  const firstName = employee.name.split(" ")[0];

  return (
    <AppPage>
      {/* Hero */}
      <section className="grid-mesh mb-8 overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-lift md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Badge
              variant="outline"
              className="rounded-full border-accent/40 bg-accent-soft text-[11px] font-semibold text-accent"
            >
              Demo Environment · fictional data
            </Badge>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Welcome, {firstName} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              Your skills are more than your job title. {hidden.length} discovered capabilities are
              already shaping your internal opportunities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AnalyzeSkillsButton employeeId={employeeId} onAnalyzed={insights.refetchSkills} />
            <Button asChild variant="outline" className="gap-2">
              <Link to="/career-simulator">
                <FlaskConical className="size-4" aria-hidden />
                Career Simulator
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current role"
          value={employee.current_role}
          sublabel={`${employee.department} · ${employee.tenure_years} yrs`}
          icon={Briefcase}
        />
        <MetricCard
          label="Skill confidence"
          value={`${Math.round(
            skills.reduce((total, skill) => total + skill.confidence, 0) /
              Math.max(1, skills.length),
          )}%`}
          sublabel="Average evidence confidence"
          icon={Gauge}
          tone="accent"
        />
        <MetricCard
          label="Hidden skills"
          value={String(hidden.length)}
          sublabel="Discovered beyond the job title"
          icon={Sparkles}
          tone="accent"
        />
        <MetricCard
          label="Career readiness"
          value={`${insights.readiness}%`}
          sublabel={matches[0] ? `for ${matches[0].roleTitle}` : "no match yet"}
          icon={TrendingUp}
          tone="success"
        />
      </section>

      {/* PRIORITY 1 — AI Discovered Hidden Skills */}
      <section className="mb-12">
        <div className="mb-5 overflow-hidden rounded-2xl border border-accent/25 bg-accent-soft/60 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Priority insight
              </p>
              <h2 className="mt-1.5 flex items-center gap-2 font-display text-2xl font-semibold md:text-3xl">
                <Sparkles className="size-6 text-accent" aria-hidden />
                AI Discovered Hidden Skills
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Capabilities demonstrated in real projects, certifications and consented public
                evidence — each card shows the exact evidence behind it. Never an unsupported claim.
              </p>
            </div>
            <Badge className="rounded-full border-transparent bg-accent text-accent-foreground">
              {hidden.length} discovered
            </Badge>
          </div>
        </div>
        <HiddenSkillsGrid items={hidden} />
      </section>

      {/* PRIORITY 2 — Recommended Internal Roles */}
      <section className="mb-12">
        <SectionHeading
          icon={Compass}
          title="Recommended Internal Roles"
          description="Transparent hybrid scoring: 60% semantic alignment, 30% required-skill coverage, 10% transferable bonus. Deterministic and reproducible."
          action={
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/roles">
                All opportunities
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {matches.slice(0, 4).map((match) => (
            <RoleMatchCard key={match.roleId} match={match} />
          ))}
        </div>
      </section>

      {/* PRIORITY 3 — Career Trajectory Simulator + growth */}
      <section className="mb-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="surface-card overflow-hidden border-accent/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4.5 text-accent" aria-hidden />
              Career Trajectory Simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What roles could you unlock next? Add skills you plan to learn and watch projected role
              readiness move in real time.
            </p>
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Current best match
              </p>
              <p className="mt-1 font-display text-xl font-semibold">
                {matches[0]?.roleTitle ?? "—"} · {matches[0]?.matchScore ?? 0}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {matches[0]?.gaps.length ?? 0} skill gaps stand between you and this role.
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/career-simulator">
                Simulate my next move
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <DisclosureNote>
              Projected role readiness, not a guaranteed outcome or employment prediction.
            </DisclosureNote>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">
              Skill radar vs {targetRole?.title ?? matches[0]?.roleTitle ?? "target role"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SkillRadar
              vector={buildSkillVector(skills)}
              role={targetRole ?? insights.roles[0] ?? null}
            />
          </CardContent>
        </Card>
      </section>

      {/* Growth + badges */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Career growth</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="rounded-full">
                {employee.current_role}
              </Badge>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              <Badge className="rounded-full border-transparent bg-primary text-primary-foreground">
                {targetRole?.title ?? employee.career_goal ?? "Target role"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Skills to acquire:{" "}
              <strong className="text-foreground">
                {targetMatch?.gaps.map((gap) => gap.skill).join(", ") || "none identified"}
              </strong>
            </p>
            <p className="text-muted-foreground">
              Estimated timeline:{" "}
              <strong className="text-foreground">
                {targetMatch ? `${Math.max(3, targetMatch.gaps.length + 1)} months` : "—"}
              </strong>{" "}
              · {employee.career_goal_timeline ?? "self-paced"}
            </p>
            {targetMatch ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/role/$roleId" params={{ roleId: targetMatch.roleId }}>
                  Open the role plan
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Hidden skill badges</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {HIDDEN_BADGES.map((badge) => (
              <div
                key={badge.label}
                className="hover-lift flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-3"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <badge.icon className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppPage>
  );
}
