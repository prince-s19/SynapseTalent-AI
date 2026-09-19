import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Network, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppPage } from "@/components/talent/page";
import {
  DisclosureNote,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  ProficiencyBar,
  SkillTypeBadge,
  SourceBadge,
} from "@/components/talent/primitives";
import { EvidenceNote } from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/talent/app-state";
import { skillsQuery } from "@/lib/talent/queries";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

export const Route = createFileRoute("/skills")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search['q'] === "string" ? (search['q'] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Skill Intelligence — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Browse the skill catalogue and the evidence behind every skill recorded for the selected employee.",
      },
      { property: "og:title", content: "Skill Intelligence — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Skill catalogue, proficiency, confidence and the evidence behind each entry.",
      },
    ],
  }),
  component: SkillsPage,
});

function SkillsPage() {
  const { q } = Route.useSearch();
  const { employeeId } = useAppState();
  const [query, setQuery] = useState(q);
  const catalogue = useQuery(skillsQuery());
  const insights = useEmployeeInsights(employeeId);

  const term = query.trim().toLowerCase();
  const mySkills = useMemo(
    () =>
      insights.skills
        .filter((skill) => !term || skill.name.toLowerCase().includes(term))
        .sort((a, b) => b.proficiency - a.proficiency),
    [insights.skills, term],
  );
  const catalogueSkills = useMemo(
    () =>
      (catalogue.data ?? []).filter(
        (skill) =>
          !term ||
          skill.name.toLowerCase().includes(term) ||
          skill.category.toLowerCase().includes(term),
      ),
    [catalogue.data, term],
  );

  return (
    <AppPage>
      <PageHeader
        eyebrow="Skill Intelligence"
        title="Every skill, with its evidence"
        description="Skills recorded for the selected employee, plus the full demo skill catalogue grouped by category."
      >
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter skills…"
            aria-label="Filter skills"
            className="pl-9"
          />
        </div>
      </PageHeader>

      {insights.isLoading ? (
        <LoadingBlock rows={4} />
      ) : insights.isError ? (
        <ErrorBlock message="Skills could not be loaded." onRetry={insights.refetch} />
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 font-display text-lg font-semibold">
              {insights.employee?.name ?? "Employee"} · {mySkills.length} recorded skills
            </h2>
            {mySkills.length === 0 ? (
              <EmptyState message="No skills match this filter for the selected employee." />
            ) : (
              <Card className="surface-card">
                <CardContent className="grid gap-5 p-6 md:grid-cols-2">
                  {mySkills.map((skill) => (
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
            )}
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <Network className="size-5 text-accent" aria-hidden /> Skill catalogue
            </h2>
            {catalogueSkills.length === 0 ? (
              <EmptyState message="No catalogue skills match this filter." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {catalogueSkills.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="outline"
                    className="rounded-full px-3 py-1 text-xs font-medium transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    {skill.name}
                    <span className="ml-1.5 text-muted-foreground">{skill.category}</span>
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <DisclosureNote>
            Demo environment: all skills, evidence and employees are fictional.
          </DisclosureNote>
        </div>
      )}
    </AppPage>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
      <Search className="mx-auto size-7 text-muted-foreground" aria-hidden />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
