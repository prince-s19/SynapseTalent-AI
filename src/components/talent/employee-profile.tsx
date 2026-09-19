import { BadgeCheck, Briefcase, FolderGit2, Network, Target } from "lucide-react";

import { useState } from "react";

import { SkillAnalysisReport } from "@/components/talent/analysis-report";
import { SkillRadar } from "@/components/talent/charts";
import { EnrichProfilePanel } from "@/components/talent/enrichment";

import {
  DisclosureNote,
  ErrorBlock,
  EvidenceNote,
  LoadingBlock,
  PageHeader,
  ProficiencyBar,
  SectionHeading,
  SkillTypeBadge,
  SourceBadge,
} from "@/components/talent/primitives";
import {
  AnalyzeSkillsButton,
  HiddenSkillsGrid,
  RoleMatchCard,
  SkillGraph,
  toHiddenCards,
} from "@/components/talent/sections";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningAction } from "@/lib/talent/analysis";
import { buildSkillVector } from "@/lib/talent/matching";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

export function EmployeeProfileView({ employeeId }: { employeeId: string }) {
  const insights = useEmployeeInsights(employeeId);
  const [aiRun, setAiRun] = useState<{
    summary: string | null;
    learningActions: LearningAction[];
  } | null>(null);

  if (insights.isLoading) {
    return (
      <div className="space-y-6">
        <LoadingBlock rows={2} />
        <LoadingBlock rows={3} />
      </div>
    );
  }
  if (insights.isError || !insights.employee) {
    return (
      <ErrorBlock
        message="This talent profile could not be loaded from the demo environment."
        onRetry={insights.refetch}
      />
    );
  }

  const { employee, skills, projects, matches, targetRole } = insights;
  const direct = skills.filter((skill) => skill.skill_type === "direct");
  const vector = buildSkillVector(skills);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="My Talent Profile"
        title={employee.name}
        description={`${employee.current_role} · ${employee.department} · ${employee.tenure_years} years tenure`}
      >
        <AnalyzeSkillsButton
          employeeId={employeeId}
          onAnalyzed={(result) => {
            setAiRun({ summary: result.summary, learningActions: result.learningActions });
            insights.refetchSkills();
          }}
        />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="surface-card hover-lift md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="size-4.5 text-accent" aria-hidden /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="leading-relaxed">{employee.bio ?? "No bio recorded for this profile."}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="rounded-full">
                Career goal: {employee.career_goal ?? "Not set"}
              </Badge>
              {employee.career_goal_timeline ? (
                <Badge variant="outline" className="rounded-full">
                  Timeline: {employee.career_goal_timeline}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card className="surface-card hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4.5 text-accent" aria-hidden /> Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-semibold brand-gradient-text">
              {insights.readiness}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Projected readiness for the strongest internal match
              {matches[0] ? `: ${matches[0].roleTitle}` : ""}.
            </p>
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionHeading
          title="AI Discovered Hidden Skills"
          description="Capabilities demonstrated in real work but invisible in the job title. Every card cites its evidence."
        />
        <HiddenSkillsGrid items={toHiddenCards(skills)} />
      </section>

      <SkillAnalysisReport
        skills={skills}
        matches={matches}
        summary={aiRun?.summary ?? null}
        learningActions={aiRun?.learningActions ?? null}
      />

      <EnrichProfilePanel employeeId={employeeId} onEnriched={insights.refetchSkills} />


      <section>
        <SectionHeading title="Declared and direct skills" icon={BadgeCheck} />
        <Card className="surface-card">
          <CardContent className="grid gap-5 p-6 md:grid-cols-2">
            {direct.map((skill) => (
              <div key={skill.id} className="space-y-2">
                <ProficiencyBar label={skill.name} value={skill.proficiency} />
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source={skill.source} />
                  <SkillTypeBadge type={skill.skill_type} />
                  <span className="text-xs text-muted-foreground">
                    Confidence {Math.round(skill.confidence)}%
                  </span>
                </div>
                {skill.evidence ? <EvidenceNote>{skill.evidence}</EvidenceNote> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">
              Skill radar vs {targetRole?.title ?? matches[0]?.roleTitle ?? "target role"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SkillRadar
              vector={vector}
              role={
                targetRole ??
                insights.roles.find((role) => role.id === matches[0]?.roleId) ??
                insights.roles[0] ??
                null
              }
            />

          </CardContent>
        </Card>
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderGit2 className="size-4.5 text-accent" aria-hidden /> Project evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects recorded.</p>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="rounded-xl border border-border/70 bg-muted/40 p-4">
                  <p className="font-medium">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{project.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(project.tech_stack ?? []).map((tech) => (
                      <Badge key={tech} variant="outline" className="rounded-full text-[11px]">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Recommended Internal Roles"
          description="Deterministic hybrid scoring: 60% semantic alignment, 30% required-skill coverage, 10% transferable bonus."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {matches.slice(0, 4).map((match) => (
            <RoleMatchCard key={match.roleId} match={match} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Skill graph"
          icon={Network}
          description="Lightweight relationship view: projects and skills on the left of the graph feed the internal roles on the right."
        />
        <Card className="surface-card">
          <CardContent className="p-6">
            <SkillGraph
              employee={employee}
              skills={skills}
              projects={projects}
              topMatches={matches}
            />
            <div className="mt-4">
              <DisclosureNote>
                Demo visualisation built from stored relationships. Evidence-based AI explanation —
                not a trained graph neural network.
              </DisclosureNote>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
