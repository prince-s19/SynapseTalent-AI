import { createFileRoute } from "@tanstack/react-router";

import { AppPage } from "@/components/talent/page";
import {
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  ReadinessBadge,
  ScoreDial,
} from "@/components/talent/primitives";
import { MatchExplanation, RoadmapPanel } from "@/components/talent/sections";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppState } from "@/lib/talent/app-state";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

export const Route = createFileRoute("/role/$roleId")({
  head: () => ({
    meta: [
      { title: "Role Match Details — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Why you're a match: strengths, transferable skills, skill gaps, recommended next steps and a generated career plan.",
      },
      { property: "og:title", content: "Role Match Details — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Evidence-based explanation of an internal role match, with gaps and next steps.",
      },
    ],
  }),
  component: RoleDetailPage,
});

function RoleDetailPage() {
  const { roleId } = Route.useParams();
  const { employeeId } = useAppState();
  const insights = useEmployeeInsights(employeeId);

  if (insights.isLoading) {
    return (
      <AppPage>
        <LoadingBlock rows={4} />
      </AppPage>
    );
  }

  const role = insights.roles.find((item) => item.id === roleId);
  const match = insights.matches.find((item) => item.roleId === roleId);

  if (!role || !match) {
    return (
      <AppPage>
        <ErrorBlock
          message="This internal role is not part of the demo environment."
          onRetry={insights.refetch}
        />
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHeader eyebrow={role.department} title={role.title} description={role.description ?? ""}>
        <Badge variant="secondary" className="rounded-full">
          {role.seniority ?? "Internal role"}
        </Badge>
      </PageHeader>

      <Card className="surface-card mb-8 border-accent/25">
        <CardContent className="flex flex-wrap items-center gap-6 p-6">
          <ScoreDial score={match.matchScore} size={112} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">Projected role readiness</h2>
              <ReadinessBadge readiness={match.readiness} />
            </div>
            <p className="text-sm text-muted-foreground">
              {match.strengths.length} matching skills · {match.transferables.length} transferable
              skills · {match.gaps.length} gaps · evidence confidence {match.confidence}%
            </p>
            {role.responsibilities ? (
              <p className="text-sm text-muted-foreground">{role.responsibilities}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <MatchExplanation match={match} role={role} />

      <div className="mt-8">
        <RoadmapPanel employeeId={employeeId} role={role} match={match} />
      </div>
    </AppPage>
  );
}
