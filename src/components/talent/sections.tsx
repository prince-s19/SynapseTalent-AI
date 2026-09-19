import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Map as MapIcon,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DisclosureNote,
  EvidenceNote,
  ProficiencyBar,
  ReadinessBadge,
  RoleLink,
  ScoreDial,
  SectionHeading,
  SkillTypeBadge,
  SourceBadge,
} from "@/components/talent/primitives";
import type { LearningAction } from "@/lib/talent/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { analyzeEmployee, generateCareerRoadmap } from "@/lib/talent/ai.functions";
import type {
  CareerRoadmap,
  Employee,
  EmployeeSkill,
  HiddenSkillCard,
  MatchResult,
  Project,
  Role,
} from "@/lib/talent/types";

export function toHiddenCards(skills: EmployeeSkill[]): HiddenSkillCard[] {
  return skills
    .filter((skill) => skill.skill_type !== "direct" && Boolean(skill.evidence))
    .map((skill) => ({
      skill: skill.name,
      proficiency: Math.round(skill.proficiency),
      confidence: Math.round(skill.confidence),
      source: skill.source,
      evidence: skill.evidence ?? "",
      explanation:
        skill.skill_type === "transferable"
          ? "Adjacent capability implied by demonstrated work. Transferable, not equivalent."
          : "Demonstrated in real work but not reflected in the current job title.",
      skillType: skill.skill_type,
    }))
    .sort((a, b) => b.proficiency - a.proficiency);
}

export function HiddenSkillsGrid({ items }: { items: HiddenSkillCard[] }) {
  if (items.length === 0) {
    return (
      <Card className="surface-card">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No hidden skills discovered yet. Run <strong>Analyze Skills</strong> to scan projects,
          certifications and consented public evidence.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card
          key={`${item.skill}-${item.source}`}
          className="surface-card border-border/70 transition-shadow duration-300 hover:shadow-lift"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="font-display text-base">{item.skill}</CardTitle>
              <SkillTypeBadge type={item.skillType} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProficiencyBar label="Proficiency" value={item.proficiency} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Confidence {item.confidence}%</span>
              <SourceBadge source={item.source} />
            </div>
            {item.evidence ? <EvidenceNote>{item.evidence}</EvidenceNote> : null}
            <p className="text-xs leading-relaxed text-muted-foreground">{item.explanation}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RoleMatchCard({ match }: { match: MatchResult }) {
  const topStrengths = match.strengths.slice(0, 3);
  const topGap = match.gaps[0];
  return (
    <Card className="surface-card border-border/70 transition-shadow duration-300 hover:shadow-lift">
      <CardContent className="flex flex-wrap items-center gap-5 p-5">
        <ScoreDial score={match.matchScore} size={88} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold">{match.roleTitle}</h3>
            <ReadinessBadge readiness={match.readiness} />
          </div>
          <p className="text-xs text-muted-foreground">
            Top strengths:{" "}
            {topStrengths.length > 0
              ? topStrengths.map((strength) => strength.skill).join(", ")
              : "building evidence"}
          </p>
          {topGap ? (
            <p className="text-xs text-muted-foreground">
              Biggest gap: <strong className="text-foreground">{topGap.skill}</strong> {topGap.current}%
              → {topGap.required}% required
            </p>
          ) : (
            <p className="text-xs text-success">All required skills met.</p>
          )}
          <RoleLink roleId={match.roleId}>View details</RoleLink>
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchExplanation({ match, role }: { match: MatchResult; role: Role }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">Why you&apos;re a match</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <ScoreLine label="Semantic skill alignment (60%)" value={match.semanticScore} />
            <ScoreLine label="Required skill coverage (30%)" value={match.skillCoverageScore} />
            <ScoreLine label="Transferable skill bonus (10%)" value={match.transferableScore} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your profile reaches <strong className="text-foreground">{match.matchScore}%</strong>{" "}
            projected readiness for {role.title}, with {match.strengths.length} evidence-backed
            matching skills, {match.transferables.length} transferable skills and {match.gaps.length}{" "}
            gaps. Evidence confidence averages {match.confidence}%.
          </p>
          <DisclosureNote>
            Evidence-based AI explanation. Scores are computed deterministically from your recorded
            skills and evidence — not from a trained graph model, and not a guaranteed outcome.
          </DisclosureNote>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">Your strengths</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {match.strengths.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No required skills met yet for this role.
            </p>
          ) : (
            match.strengths.slice(0, 6).map((strength) => (
              <div key={strength.skill} className="space-y-2">
                <ProficiencyBar
                  label={strength.skill}
                  value={strength.proficiency}
                  required={strength.required}
                />
                <div className="flex items-center gap-2">
                  <SourceBadge source={strength.source} />
                  <SkillTypeBadge type={strength.skillType} />
                </div>
                {strength.evidence ? <EvidenceNote>{strength.evidence}</EvidenceNote> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">Transferable skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {match.transferables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No adjacent skills detected for this role&apos;s requirements.
            </p>
          ) : (
            match.transferables.map((transfer) => (
              <div key={`${transfer.skill}-${transfer.viaSkill}`} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="rounded-full">
                    {transfer.viaSkill} {transfer.viaProficiency}%
                  </Badge>
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                  <span className="font-medium">{transfer.skill}</span>
                  <SkillTypeBadge type="transferable" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Adjacency confidence {Math.round(transfer.adjacencyConfidence * 100)}% — counts as{" "}
                  {transfer.effectiveProficiency}% towards the required {transfer.required}%.
                  Transferable, not equivalent.
                </p>
                {transfer.evidence ? <EvidenceNote>{transfer.evidence}</EvidenceNote> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">Skill gaps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {match.gaps.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" aria-hidden /> No gaps against the required skills.
            </p>
          ) : (
            match.gaps.map((gap) => (
              <div key={gap.skill} className="space-y-1.5">
                <ProficiencyBar label={gap.skill} value={gap.current} required={gap.required} />
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                  {gap.closestTransferable
                    ? `Closest transferable skill: ${gap.closestTransferable.viaSkill} at ${gap.closestTransferable.viaProficiency}%.`
                    : "No adjacent skill detected — this one starts from fundamentals."}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="surface-card lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Recommended next steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {match.recommendations.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                You already meet the required skills — ask for an internal readiness review.
              </li>
            ) : (
              match.recommendations.map((recommendation, index) => (
                <li key={recommendation} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{recommendation}</span>
                </li>
              ))
            )}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <Progress value={value} className="mt-1 h-1.5" />
    </div>
  );
}

export function AnalyzeSkillsButton({
  employeeId,
  onAnalyzed,
}: {
  employeeId: string;
  onAnalyzed?: (result: {
    hiddenSkills: HiddenSkillCard[];
    learningActions: LearningAction[];
    summary: string | null;
  }) => void;
}) {
  const analyze = useServerFn(analyzeEmployee);
  const mutation = useMutation({
    mutationFn: () => analyze({ data: { employeeId } }),
    onSuccess: (result) => {
      if (result.notice) toast.warning(result.notice);
      else
        toast.success(
          result.updated > 0
            ? `Analysis complete — ${result.updated} discovered skills refreshed.`
            : "Analysis complete.",
        );
      onAnalyzed?.({
        hiddenSkills: result.hiddenSkills,
        learningActions: result.learningActions,
        summary: result.summary,
      });
    },
    onError: () => toast.error("Skill analysis failed. Showing existing demo data."),
  });

  return (
    <Button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="gap-2"
      aria-label="Analyze skills with AI"
    >
      {mutation.isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="size-4" aria-hidden />
      )}
      {mutation.isPending ? "Analyzing evidence…" : "Analyze Skills"}
    </Button>
  );
}

export function RoadmapPanel({
  employeeId,
  role,
  match,
}: {
  employeeId: string;
  role: Role;
  match: MatchResult;
}) {
  const generate = useServerFn(generateCareerRoadmap);
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const mutation = useMutation({
    mutationFn: () => generate({ data: { employeeId, targetRoleId: role.id } }),
    onSuccess: (result) => {
      setRoadmap(result.roadmap);
      if (result.notice) toast.warning(result.notice);
      else toast.success("Career plan generated from your identified skill gaps.");
    },
    onError: () => toast.error("Roadmap generation failed. Please try again."),
  });

  return (
    <Card className="surface-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapIcon className="size-4.5 text-accent" aria-hidden /> Career plan for {role.title}
          </CardTitle>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {mutation.isPending ? "Building plan…" : "Build My Career Plan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mutation.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : roadmap ? (
          <>
            <p className="text-sm text-muted-foreground">
              {roadmap.summary ??
                `Built from the ${match.gaps.length} gaps identified for ${role.title}.`}{" "}
              Estimated {roadmap.estimatedMonths} months.
            </p>
            <ol className="space-y-3">
              {roadmap.steps.map((step) => (
                <li
                  key={`${step.month}-${step.skill}`}
                  className="rounded-xl border border-border/70 bg-muted/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      Month {step.month}
                    </Badge>
                    <span className="font-medium">{step.skill}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{step.action}</p>
                  {step.project ? (
                    <p className="mt-1 text-xs text-muted-foreground">Project: {step.project}</p>
                  ) : null}
                  {step.outcome ? (
                    <p className="mt-1 text-xs text-accent">Outcome: {step.outcome}</p>
                  ) : null}
                </li>
              ))}
            </ol>
            <DisclosureNote>
              Generated from your identified skill gaps. Projected readiness, not a guaranteed
              outcome.
            </DisclosureNote>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate a month-by-month plan built from the {match.gaps.length} skill gaps identified
            for this role, finishing with an internal opportunity readiness review.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Lightweight SVG skill graph — employee at the centre, skills and roles around it. */
export function SkillGraph({
  employee,
  skills,
  projects,
  topMatches,
}: {
  employee: Employee;
  skills: EmployeeSkill[];
  projects: Project[];
  topMatches: MatchResult[];
}) {
  const nodes = useMemo(() => {
    const topSkills = [...skills]
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 7)
      .map((skill) => ({
        id: skill.name,
        label: skill.name,
        kind: skill.skill_type === "direct" ? ("skill" as const) : ("hidden" as const),
      }));
    const projectNodes = projects.slice(0, 3).map((project) => ({
      id: project.name,
      label: project.name,
      kind: "project" as const,
    }));
    const roleNodes = topMatches.slice(0, 3).map((match) => ({
      id: match.roleId,
      label: `${match.roleTitle} · ${match.matchScore}%`,
      kind: "role" as const,
    }));
    return [...projectNodes, ...topSkills, ...roleNodes];
  }, [skills, projects, topMatches]);

  const width = 760;
  const height = 420;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 165;

  const palette = {
    skill: "var(--color-primary)",
    hidden: "var(--color-accent)",
    project: "var(--color-chart-2)",
    role: "var(--color-chart-4)",
  } as const;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[420px] w-full min-w-[640px]"
        role="img"
        aria-label={`Skill graph for ${employee.name}`}
      >
        {nodes.map((node, index) => {
          const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const color = palette[node.kind];
          return (
            <g key={`${node.kind}-${node.id}`}>
              <line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={1.5}
                strokeDasharray={node.kind === "role" ? "5 4" : undefined}
              />
              <circle cx={x} cy={y} r={7} fill={color} fillOpacity={0.9} />
              <text
                x={x}
                y={y - 13}
                textAnchor={x > cx ? "start" : "end"}
                fontSize={11}
                fill="var(--color-foreground)"
              >
                {node.label.length > 26 ? `${node.label.slice(0, 26)}…` : node.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={40} fill="var(--color-accent)" fillOpacity={0.16} />
        <circle cx={cx} cy={cy} r={28} fill="var(--color-primary)" />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--color-primary-foreground)"
        >
          {employee.name.split(" ")[0]}
        </text>
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <LegendDot color={palette.skill} label="Declared / direct skill" />
        <LegendDot color={palette.hidden} label="Hidden or transferable skill" />
        <LegendDot color={palette.project} label="Project evidence" />
        <LegendDot color={palette.role} label="Internal role match" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

export { SectionHeading };
