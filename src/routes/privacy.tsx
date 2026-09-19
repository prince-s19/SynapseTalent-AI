import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Globe, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppPage } from "@/components/talent/page";
import {
  DisclosureNote,
  LoadingBlock,
  PageHeader,
  SectionHeading,
} from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/lib/talent/app-state";
import { enrichProfile, resetDemoProfile, updateConsent } from "@/lib/talent/enrich.functions";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Consent — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "You control your talent data: consent toggles for public enrichment and AI analysis, what data is used, and how to delete it.",
      },
      { property: "og:title", content: "Privacy & Consent — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Transparent consent controls for skill analysis and public profile enrichment.",
      },
    ],
  }),
  component: PrivacyPage,
});

const TOGGLES = [
  {
    key: "github_enabled" as const,
    label: "Public GitHub profile",
    body: "Reads only your public profile page to spot professional signals such as languages and project topics.",
  },
  {
    key: "portfolio_enabled" as const,
    label: "Public portfolio site",
    body: "Reads a public portfolio or personal site you provide. Never private pages.",
  },
  {
    key: "public_web_enabled" as const,
    label: "Public web enrichment",
    body: "Reads a public project page you provide, for example a conference talk or case study.",
  },
  {
    key: "ai_analysis_enabled" as const,
    label: "AI skill analysis",
    body: "Lets the AI read your recorded projects and certifications to discover hidden skills.",
  },
];

function PrivacyPage() {
  const { employeeId } = useAppState();
  const insights = useEmployeeInsights(employeeId);
  const saveConsent = useServerFn(updateConsent);
  const enrich = useServerFn(enrichProfile);
  const reset = useServerFn(resetDemoProfile);
  const [url, setUrl] = useState("https://github.com/");

  const consent = insights.consent ?? {
    github_enabled: false,
    portfolio_enabled: false,
    public_web_enabled: false,
    ai_analysis_enabled: true,
  };

  const consentMutation = useMutation({
    mutationFn: (next: typeof consent) => saveConsent({ data: { employeeId, ...next } }),
    onSuccess: () => {
      toast.success("Consent preferences saved.");
      insights.refetch();
    },
    onError: () => toast.error("Could not save consent preferences."),
  });

  const enrichMutation = useMutation({
    mutationFn: () =>
      enrich({
        data: {
          employeeId,
          source: url.includes("github.com") ? "github" : "portfolio",
          targetUrl: url,
        },
      }),
    onSuccess: (result) => {
      if (result.status === "success") toast.success(result.notice);
      else toast.warning(result.notice);
      insights.refetch();
    },
    onError: () => toast.error("Enrichment failed — continuing with demo data."),
  });

  const resetMutation = useMutation({
    mutationFn: () => reset({ data: { employeeId } }),
    onSuccess: () => {
      toast.success("Demo profile reset: AI-inferred and enrichment data removed.");
      insights.refetch();
    },
    onError: () => toast.error("Could not reset the demo profile."),
  });

  if (insights.isLoading) {
    return (
      <AppPage>
        <LoadingBlock rows={4} />
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Privacy & Consent"
        title="You control your talent data."
        description="Demo Mode uses fictional data. External enrichment is off by default, only ever reads public pages, and can be switched off at any time."
      >
        <Badge variant="outline" className="gap-1.5 rounded-full border-success/40 text-success">
          <ShieldCheck className="size-3.5" aria-hidden /> Demo Mode
        </Badge>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Data sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {TOGGLES.map((toggle) => (
              <div
                key={toggle.key}
                className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 p-4"
              >
                <div>
                  <Label htmlFor={toggle.key} className="text-sm font-medium">
                    {toggle.label}
                  </Label>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{toggle.body}</p>
                </div>
                <Switch
                  id={toggle.key}
                  checked={consent[toggle.key]}
                  disabled={consentMutation.isPending}
                  onCheckedChange={(checked) =>
                    consentMutation.mutate({ ...consent, [toggle.key]: checked })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="size-4.5 text-accent" aria-hidden /> Enrich public profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Optional. Reads a single public page and keeps only professional signals. If the
                provider is unavailable the demo continues on existing data.
              </p>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  aria-label="Public profile URL"
                  placeholder="https://github.com/username"
                />
                <Button
                  onClick={() => enrichMutation.mutate()}
                  disabled={enrichMutation.isPending}
                  className="gap-2"
                >
                  {enrichMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  Enrich
                </Button>
              </div>
              <DisclosureNote>
                Public URLs only. No private accounts, passwords, messages, contacts, social activity
                or sensitive personal attributes are collected or inferred.
              </DisclosureNote>
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">What we use, and why</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Declared skills and projects</strong> — to
                discover hidden and transferable capabilities.
              </p>
              <p>
                <strong className="text-foreground">Certifications</strong> — as evidence behind a
                proficiency estimate.
              </p>
              <p>
                <strong className="text-foreground">Consented public pages</strong> — only when you
                switch the source on above.
              </p>
              <p>
                No surveillance, no monitoring of messages or social activity, and no decisions based
                on protected characteristics.
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-medium">Delete demo profile data</p>
                <p className="text-xs text-muted-foreground">
                  Removes AI-inferred skills, enrichment records and generated roadmaps.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="gap-2"
              >
                {resetMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                Reset profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <SectionHeading title="Enrichment history" />
        {insights.enrichmentRuns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            No enrichment runs yet — the profile is built entirely from demo data.
          </div>
        ) : (
          <Card className="surface-card">
            <CardContent className="space-y-3 p-5">
              {insights.enrichmentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs"
                >
                  <span className="truncate">{run.target}</span>
                  <Badge variant="secondary" className="rounded-full">
                    {run.status === "success" ? "Public profile enrichment" : run.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </AppPage>
  );
}
