import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, Rocket, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { BeforeAfterChart } from "@/components/talent/charts";
import { AppPage } from "@/components/talent/page";
import {
  DisclosureNote,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  ProficiencyBar,
  ReadinessBadge,
  RoleLink,
  SectionHeading,
} from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/lib/talent/app-state";
import { buildSkillVector, scoreAllRoles, withSimulatedSkills } from "@/lib/talent/matching";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

export const Route = createFileRoute("/career-simulator")({
  head: () => ({
    meta: [
      { title: "Career Trajectory Simulator — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "What if I learn new skills? Simulate how acquiring specific skills changes projected internal role readiness.",
      },
      { property: "og:title", content: "Career Trajectory Simulator — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Interactive before/after view of projected role readiness as skills are added.",
      },
    ],
  }),
  component: SimulatorPage,
});

const SIMULATED_PROFICIENCY_DEFAULT = 70;

function SimulatorPage() {
  const { employeeId } = useAppState();
  const insights = useEmployeeInsights(employeeId);
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState(SIMULATED_PROFICIENCY_DEFAULT);

  const candidateSkills = useMemo(() => {
    const gaps = new Map<string, number>();
    for (const match of insights.matches) {
      for (const gap of match.gaps) {
        gaps.set(gap.skill, Math.max(gaps.get(gap.skill) ?? 0, gap.required));
      }
    }
    return [...gaps.entries()]
      .map(([skill, required]) => ({ skill, required }))
      .sort((a, b) => b.required - a.required)
      .slice(0, 16);
  }, [insights.matches]);

  const current = insights.matches;
  const projected = useMemo(() => {
    if (selected.length === 0) return current;
    const vector = withSimulatedSkills(
      buildSkillVector(insights.skills),
      selected.map((skill) => ({ skill, proficiency: level })),
    );
    return scoreAllRoles(vector, insights.roles);
  }, [selected, level, insights.skills, insights.roles, current]);

  const unlocked = useMemo(
    () =>
      projected.filter((match) => {
        const before = current.find((item) => item.roleId === match.roleId);
        return (
          match.matchScore >= 72 && (before ? before.matchScore < 72 : true) && selected.length > 0
        );
      }),
    [projected, current, selected.length],
  );

  const bestBefore = current[0];
  const bestAfter = projected[0];
  const delta =
    bestAfter && bestBefore
      ? (projected.find((item) => item.roleId === bestBefore.roleId)?.matchScore ?? 0) -
        bestBefore.matchScore
      : 0;

  if (insights.isLoading) {
    return (
      <AppPage>
        <LoadingBlock rows={4} />
      </AppPage>
    );
  }
  if (insights.isError) {
    return (
      <AppPage>
        <ErrorBlock message="The simulator could not load your skills." onRetry={insights.refetch} />
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Career Trajectory Simulator"
        title="What if I learn new skills?"
        description="Pick the skills you plan to learn. Projected role readiness recalculates instantly using the same deterministic scoring as your live matches."
      >
        {selected.length > 0 ? (
          <Button variant="outline" onClick={() => setSelected([])}>
            Reset simulation
          </Button>
        ) : null}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4.5 text-accent" aria-hidden /> Skills to learn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Target proficiency</span>
                <span className="text-muted-foreground">{level}%</span>
              </div>
              <Slider
                value={[level]}
                onValueChange={(value) => setLevel(value[0] ?? SIMULATED_PROFICIENCY_DEFAULT)}
                min={40}
                max={95}
                step={5}
                aria-label="Simulated proficiency level"
              />
            </div>
            <div className="space-y-2">
              {candidateSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No skill gaps identified — you already meet the required skills for every demo role.
                </p>
              ) : (
                candidateSkills.map((candidate) => {
                  const active = selected.includes(candidate.skill);
                  return (
                    <label
                      key={candidate.skill}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "border-accent/50 bg-accent-soft"
                          : "border-border/70 bg-muted/30 hover:border-accent/30"
                      }`}
                    >
                      <span>
                        <span className="font-medium">{candidate.skill}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          required {candidate.required}%
                        </span>
                      </span>
                      <Switch
                        checked={active}
                        onCheckedChange={(checked) =>
                          setSelected((previous) =>
                            checked
                              ? [...previous, candidate.skill]
                              : previous.filter((skill) => skill !== candidate.skill),
                          )
                        }
                        aria-label={`Simulate learning ${candidate.skill}`}
                      />
                    </label>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="surface-card">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Current match
                </p>
                <p className="mt-1 font-display text-3xl font-semibold">
                  {bestBefore?.matchScore ?? 0}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{bestBefore?.roleTitle ?? "—"}</p>
              </CardContent>
            </Card>
            <Card className="surface-card border-accent/30">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-accent">
                  Projected role readiness
                </p>
                <p className="mt-1 font-display text-3xl font-semibold brand-gradient-text">
                  {bestAfter?.matchScore ?? 0}%
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {delta > 0 ? (
                    <>
                      <TrendingUp className="size-3.5 text-success" aria-hidden />
                      <span className="text-success">
                        +{delta}% on {bestBefore?.roleTitle}
                      </span>
                    </>
                  ) : (
                    "Select skills to project your next move"
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Before vs after by role</CardTitle>
            </CardHeader>
            <CardContent>
              <BeforeAfterChart current={current} projected={projected} />
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <SectionHeading
          icon={Rocket}
          title="New opportunities unlocked"
          description="Roles that reach at least 72% projected readiness once the selected skills are in place."
        />
        {unlocked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
            <Sparkles className="mx-auto size-7 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-display text-lg font-semibold">Nothing unlocked yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a couple of skills on the left — MLOps and Docker are a good place to start.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {unlocked.map((match) => (
              <Card key={match.roleId} className="surface-card hover-lift border-accent/30">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">{match.roleTitle}</h3>
                    <Badge className="rounded-full border-transparent bg-accent text-accent-foreground">
                      {match.matchScore}%
                    </Badge>
                  </div>
                  <ReadinessBadge readiness={match.readiness} />
                  <p className="text-xs text-muted-foreground">
                    Was {current.find((item) => item.roleId === match.roleId)?.matchScore ?? 0}% ·
                    now projected {match.matchScore}%
                  </p>
                  <RoleLink roleId={match.roleId}>View role</RoleLink>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Recommended learning path"
          description="Ordered by the impact each skill has on your strongest internal match."
        />
        <Card className="surface-card">
          <CardContent className="space-y-4 p-6">
            {(bestAfter?.gaps ?? []).slice(0, 5).map((gap, index) => (
              <div key={gap.skill} className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                    {index + 1}
                  </span>
                  <span className="font-medium">{gap.skill}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                  <span className="text-xs text-muted-foreground">
                    reach {gap.required}% to close the gap
                  </span>
                </div>
                <ProficiencyBar label="Current" value={gap.current} required={gap.required} />
              </div>
            ))}
            {(bestAfter?.gaps ?? []).length === 0 ? (
              <p className="text-sm text-success">
                No gaps remain for your strongest match in this simulation.
              </p>
            ) : null}
            <DisclosureNote>
              Projected role readiness based on fictional demo data. Not a guaranteed outcome and not
              an employment prediction.
            </DisclosureNote>
          </CardContent>
        </Card>
      </section>
    </AppPage>
  );
}
