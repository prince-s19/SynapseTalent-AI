import { BadgeCheck, GraduationCap, Lightbulb, ListChecks, Sparkles, Target } from "lucide-react";

import {
  DisclosureNote,
  EvidenceNote,
  ProficiencyBar,
  SectionHeading,
  SkillTypeBadge,
  SourceBadge,
} from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningAction } from "@/lib/talent/analysis";
import { buildSkillAnalysis, confidenceBand } from "@/lib/talent/analysis";
import type { EmployeeSkill, MatchResult } from "@/lib/talent/types";

function ConfidenceChip({ confidence }: { confidence: number }) {
  const band = confidenceBand(confidence);
  const tone =
    band.band === "high"
      ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : band.band === "medium"
        ? "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "border-transparent bg-muted text-muted-foreground";
  return (
    <Badge className={`rounded-full text-[11px] ${tone}`} title={band.explanation}>
      {band.label} · {Math.round(confidence)}%
    </Badge>
  );
}

function SkillRow({ skill }: { skill: EmployeeSkill }) {
  return (
    <div className="space-y-2">
      <ProficiencyBar label={skill.name} value={skill.proficiency} />
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={skill.source} />
        <SkillTypeBadge type={skill.skill_type} />
        <ConfidenceChip confidence={skill.confidence} />
      </div>
      {skill.evidence ? <EvidenceNote>{skill.evidence}</EvidenceNote> : null}
    </div>
  );
}

function SkillBlock({
  step,
  title,
  description,
  skills,
  empty,
}: {
  step: number;
  title: string;
  description: string;
  skills: EmployeeSkill[];
  empty: string;
}) {
  return (
    <Card className="surface-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          <span className="mr-2 text-muted-foreground">{step}.</span>
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          skills.slice(0, 8).map((skill) => <SkillRow key={skill.id} skill={skill} />)
        )}
      </CardContent>
    </Card>
  );
}

export function SkillAnalysisReport({
  skills,
  matches,
  summary,
  learningActions,
}: {
  skills: EmployeeSkill[];
  matches: MatchResult[];
  summary?: string | null;
  learningActions?: LearningAction[] | null;
}) {
  const analysis = buildSkillAnalysis(skills, matches, learningActions ?? null);

  return (
    <section className="space-y-5">
      <SectionHeading
        title="Structured skill analysis"
        icon={Sparkles}
        description="A single evidence-backed view of declared, discovered, hidden and transferable skills, with proficiency, confidence, recommended roles, gaps and next learning actions."
      />

      {summary ? (
        <Card className="surface-card">
          <CardContent className="p-5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Analyst summary: </span>
            {summary}
          </CardContent>
        </Card>
      ) : null}

      <Card className="surface-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How to read confidence</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
          {[95, 60, 35].map((value) => {
            const band = confidenceBand(value);
            return (
              <div key={band.band} className="rounded-xl border border-border/70 bg-muted/40 p-3">
                <p className="font-semibold text-foreground">{band.label}</p>
                <p className="mt-1 leading-relaxed">{band.explanation}</p>
                <p className="mt-2">
                  {analysis.confidenceMix[band.band]} skill
                  {analysis.confidenceMix[band.band] === 1 ? "" : "s"} in this band
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <SkillBlock
          step={1}
          title="Declared skills"
          description="Stated by the employee on their own profile."
          skills={analysis.declared}
          empty="No declared skills recorded yet."
        />
        <SkillBlock
          step={2}
          title="Evidence-backed discovered skills"
          description="Extracted from projects, certifications and consented public sources. Each item cites the evidence it came from."
          skills={analysis.discovered}
          empty="No discovered skills yet. Run Analyze Skills to extract them from projects and certifications."
        />
        <SkillBlock
          step={3}
          title="Hidden skills"
          description="Demonstrated in delivered work but not reflected in the current job title."
          skills={analysis.hidden}
          empty="No hidden skills identified from the available evidence."
        />
        <SkillBlock
          step={4}
          title="Transferable skills"
          description="Adjacent capabilities implied by demonstrated work. Transferability is not equivalence."
          skills={analysis.transferable}
          empty="No transferable skills identified from the available evidence."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="size-4.5 text-accent" aria-hidden />
              <span>
                <span className="mr-2 text-muted-foreground">8.</span>Recommended roles
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Projected role readiness from transparent hybrid scoring: 60% semantic alignment, 30%
              required-skill coverage, 10% transferable bonus.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.recommendedRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No internal role matches available.</p>
            ) : (
              analysis.recommendedRoles.map((match) => (
                <div
                  key={match.roleId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{match.roleTitle}</p>
                    <p className="text-xs text-muted-foreground">{match.readiness}</p>
                  </div>
                  <span className="font-display text-lg font-semibold brand-gradient-text">
                    {match.matchScore}%
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4.5 text-accent" aria-hidden />
              <span>
                <span className="mr-2 text-muted-foreground">9.</span>Skill gaps
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Current evidence-backed proficiency against the level the role requires.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No material gaps across the strongest internal matches.
              </p>
            ) : (
              analysis.gaps.slice(0, 6).map((gap) => (
                <div key={gap.skill} className="space-y-1.5">
                  <ProficiencyBar label={gap.skill} value={gap.current} required={gap.required} />
                  <p className="text-xs text-muted-foreground">
                    {gap.roleTitle} requires {gap.required}% · current {gap.current}%
                    {gap.closestTransferable
                      ? ` · closest transferable skill ${gap.closestTransferable.viaSkill} at ${gap.closestTransferable.viaProficiency}%`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="size-4.5 text-accent" aria-hidden />
            <span>
              <span className="mr-2 text-muted-foreground">10.</span>Recommended learning actions
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Derived from the identified gaps above, in priority order.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.learningActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No learning actions required for the strongest internal matches.
            </p>
          ) : (
            analysis.learningActions.map((action, index) => (
              <div
                key={`${action.skill}-${index}`}
                className="rounded-xl border border-border/70 bg-muted/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ListChecks className="size-4 text-accent" aria-hidden />
                  <p className="text-sm font-medium">{action.skill}</p>
                  <Badge variant="outline" className="rounded-full text-[11px] capitalize">
                    {action.priority} priority
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{action.action}</p>
                <p className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>{action.rationale}</span>
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <DisclosureNote>
        Evidence-based AI explanation. Skills are extracted only from declared profile data,
        projects, certifications and consented public sources — the model is instructed never to
        invent evidence. Scoring is transparent rule-based hybrid scoring; this system does not
        implement graph neural networks, SHAP attribution or federated learning. Figures are
        projected role readiness, not guaranteed outcomes.
      </DisclosureNote>
    </section>
  );
}
