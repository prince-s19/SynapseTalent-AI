import { createFileRoute } from "@tanstack/react-router";
import { Compass } from "lucide-react";

import { AppPage } from "@/components/talent/page";
import {
  DisclosureNote,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from "@/components/talent/primitives";
import { RoleMatchCard } from "@/components/talent/sections";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/lib/talent/app-state";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

export const Route = createFileRoute("/roles")({
  head: () => ({
    meta: [
      { title: "Internal Opportunities — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Every internal role ranked by projected readiness, with strengths, transferable skills and gaps.",
      },
      { property: "og:title", content: "Internal Opportunities — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Ranked internal roles with transparent, evidence-based match scoring.",
      },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const { employeeId } = useAppState();
  const insights = useEmployeeInsights(employeeId);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Internal Opportunities"
        title="Roles ranked for you"
        description="Each score combines semantic skill alignment, required-skill coverage and a transferable-skill bonus. Same inputs always produce the same score."
      >
        {insights.employee ? (
          <Badge variant="secondary" className="rounded-full">
            {insights.employee.name} · {insights.employee.current_role}
          </Badge>
        ) : null}
      </PageHeader>

      {insights.isLoading ? (
        <LoadingBlock rows={5} />
      ) : insights.isError ? (
        <ErrorBlock message="Internal roles could not be loaded." onRetry={insights.refetch} />
      ) : insights.matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
          <Compass className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold">No internal roles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Roles appear here as soon as the demo catalogue is populated.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {insights.matches.map((match) => (
              <RoleMatchCard key={match.roleId} match={match} />
            ))}
          </div>
          <div className="mt-6">
            <DisclosureNote>
              Projected role readiness from demo data. Evidence-based AI explanation, not a trained
              graph model and not a guaranteed outcome.
            </DisclosureNote>
          </div>
        </>
      )}
    </AppPage>
  );
}
