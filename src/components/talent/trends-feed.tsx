import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getIndustryTrends } from "@/lib/talent/trends.functions";
import type { TrendsPayload } from "@/lib/talent/trends";

/** Live-scraped industry trends tied to this employee's identified skill gaps. */
export function IndustryTrendsFeed({ employeeId }: { employeeId: string }) {
  const [payload, setPayload] = useState<TrendsPayload | null>(null);

  const load = useMutation({
    mutationFn: (refresh: boolean) => getIndustryTrends({ data: { employeeId, refresh } }),
    onSuccess: (data) => setPayload(data),
  });

  useEffect(() => {
    load.mutate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  return (
    <section className="mt-10">
      <SectionHeading
        title="Industry trends for your field"
        icon={TrendingUp}
        description="What is moving in your industry right now, and the skill each trend points to."
        action={
          <div className="flex items-center gap-2">
            {payload ? (
              <Badge variant="outline" className="rounded-full text-[11px]">
                {payload.source === "live" ? "Live web summary" : "Curated set"}
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => load.mutate(true)}
              disabled={load.isPending}
            >
              {load.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      {load.isPending && !payload ? (
        <Card className="surface-card">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Gathering current industry
            trends…
          </CardContent>
        </Card>
      ) : null}

      {payload ? (
        <div className="space-y-3">
          {payload.notice ? (
            <p className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
              {payload.notice}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {payload.trends.map((trend) => (
              <Card key={trend.title} className="surface-card hover-lift">
                <CardContent className="space-y-3 p-5">
                  <p className="text-sm font-semibold">{trend.title}</p>
                  <p className="text-sm text-muted-foreground">{trend.summary}</p>
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Why it matters for you
                    </p>
                    <p className="mt-1 text-sm">{trend.whyItMatters}</p>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Next step: </span>
                    {trend.suggestedStep}
                  </p>
                  {trend.sourceUrl ? (
                    <a
                      href={trend.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-primary"
                    >
                      {trend.sourceName ?? "Read the source"}{" "}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
