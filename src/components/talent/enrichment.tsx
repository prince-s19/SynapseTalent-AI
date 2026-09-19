import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Github,
  Globe,
  Linkedin,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DisclosureNote, SectionHeading } from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { analyzeEmployee } from "@/lib/talent/ai.functions";
import {
  enrichProfile,
  updateConsent,
  type EnrichResult,
} from "@/lib/talent/enrich.functions";

import { consentQuery, enrichmentRunsQuery } from "@/lib/talent/queries";

type EnrichSource = "github" | "linkedin" | "slack" | "portfolio" | "public_web";

type ConsentKey = "github_enabled" | "portfolio_enabled" | "public_web_enabled";

const CONSENT_ROWS: Array<{ key: ConsentKey; label: string }> = [
  { key: "github_enabled", label: "Public GitHub" },
  { key: "portfolio_enabled", label: "Public portfolio" },
  { key: "public_web_enabled", label: "Public web (LinkedIn, project pages)" },
];


const SOURCES: Array<{
  value: EnrichSource;
  label: string;
  hint: string;
  placeholder: string;
  icon: typeof Github;
}> = [
  {
    value: "github",
    label: "Public GitHub profile",
    hint: "Public repositories, languages and project descriptions.",
    placeholder: "https://github.com/username",
    icon: Github,
  },
  {
    value: "linkedin",
    label: "Public LinkedIn profile",
    hint: "Only the publicly visible profile page. Private profiles are never accessed.",
    placeholder: "https://www.linkedin.com/in/username",
    icon: Linkedin,
  },
  {
    value: "portfolio",
    label: "Portfolio or personal site",
    hint: "Project titles, technologies and written technical work.",
    placeholder: "https://your-portfolio.dev",
    icon: Globe,
  },
  {
    value: "public_web",
    label: "Public project or article page",
    hint: "A single public page describing technical work.",
    placeholder: "https://example.com/project",
    icon: Globe,
  },
  {
    value: "slack",
    label: "Slack profile (workspace required)",
    hint: "Slack has no public profile pages, so nothing is fetched without a connected workspace.",
    placeholder: "https://workspace.slack.com/team/U123",
    icon: MessageSquare,
  },
];

export function ApifySourceBadge() {
  return (
    <Badge
      variant="outline"
      className="rounded-full border-accent/40 bg-accent-soft text-[11px] font-medium text-accent"
    >
      Apify Public Enrichment
    </Badge>
  );
}

export function EnrichProfilePanel({
  employeeId,
  onEnriched,
}: {
  employeeId: string;
  onEnriched?: () => void;
}) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<EnrichSource>("github");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<EnrichResult | null>(null);

  const consent = useQuery(consentQuery(employeeId));
  const runs = useQuery(enrichmentRunsQuery(employeeId));
  const enrich = useServerFn(enrichProfile);
  const analyze = useServerFn(analyzeEmployee);
  const saveConsent = useServerFn(updateConsent);

  const consentMutation = useMutation({
    mutationFn: async (patch: Partial<Record<ConsentKey, boolean>>) =>
      saveConsent({
        data: {
          employeeId,
          github_enabled: consent.data?.github_enabled ?? false,
          portfolio_enabled: consent.data?.portfolio_enabled ?? false,
          public_web_enabled: consent.data?.public_web_enabled ?? false,
          ai_analysis_enabled: consent.data?.ai_analysis_enabled ?? true,
          ...patch,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["consent", employeeId] });
      toast.success("Consent updated.");
    },
    onError: () => toast.error("Could not update consent."),
  });


  const active = SOURCES.find((item) => item.value === source)!;
  const consentFor =
    source === "github"
      ? consent.data?.github_enabled
      : source === "portfolio"
        ? consent.data?.portfolio_enabled
        : consent.data?.public_web_enabled;

  const mutation = useMutation({
    mutationFn: async () => {
      const enriched = await enrich({ data: { employeeId, source, targetUrl: url.trim() } });
      if (enriched.status === "success") {
        // AI skill inference runs on the newly stored public evidence.
        await analyze({ data: { employeeId } });
      }
      return enriched;
    },
    onSuccess: (enriched) => {
      setResult(enriched);
      if (enriched.status === "success") toast.success("Public evidence added and skills refreshed.");
      else toast.warning(enriched.notice);
      void queryClient.invalidateQueries({ queryKey: ["enrichment-runs", employeeId] });
      void queryClient.invalidateQueries({ queryKey: ["employee-skills"] });
      onEnriched?.();
    },
    onError: () => {
      setResult({
        status: "unavailable",
        notice: "Enrichment could not complete — using demo data.",
        signals: [],
        provider: "apify",
      });
      toast.error("Enrichment failed. The profile still works on existing data.");
    },
  });

  return (
    <section>
      <SectionHeading
        title="Enrich Public Profile"
        icon={ShieldCheck}
        description="Optional. Reads one public professional page and folds the evidence into skill discovery. The profile works fully without it."
        action={<ApifySourceBadge />}
      />
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="surface-card hover-lift">
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="enrich-source">Source</Label>
                <Select value={source} onValueChange={(value) => setSource(value as EnrichSource)}>
                  <SelectTrigger id="enrich-source" aria-label="Enrichment source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enrich-url">Public URL</Label>
                <Input
                  id="enrich-url"
                  value={url}
                  inputMode="url"
                  placeholder={active.placeholder}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <active.icon className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
              <span>{active.hint}</span>
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || url.trim().length < 8}
                className="gap-2"
                aria-label="Enrich public profile"
              >
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-4" aria-hidden />
                )}
                {mutation.isPending ? "Reading public page…" : "Enrich"}
              </Button>
              {consentFor === false ? (
                <span className="text-xs text-warning-foreground">
                  Consent for this source is off — enable it in Privacy &amp; Consent first.
                </span>
              ) : null}
            </div>

            {mutation.isPending ? (
              <div className="space-y-2 rounded-xl border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Public enrichment in progress</p>
                <p>Fetching public page → normalising professional signals → AI skill inference.</p>
              </div>
            ) : null}

            {result && !mutation.isPending ? (
              <div
                className={
                  result.status === "success"
                    ? "rounded-xl border border-success/30 bg-success/8 p-4"
                    : "rounded-xl border border-warning/40 bg-warning/10 p-4"
                }
              >
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {result.status === "success" ? (
                    <CheckCircle2 className="size-4 text-success" aria-hidden />
                  ) : (
                    <TriangleAlert className="size-4 text-warning-foreground" aria-hidden />
                  )}
                  {result.status === "success" ? "Public evidence stored" : "Using demo data"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{result.notice}</p>
                {result.signals.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {result.signals.map((signal) => (
                      <Badge key={signal} variant="secondary" className="rounded-full text-[11px]">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {(runs.data ?? []).length > 0 ? (
              <div className="space-y-2 border-t border-border/70 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent enrichment runs
                </p>
                {(runs.data ?? []).map((run) => (
                  <div
                    key={run.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
                  >
                    <span className="truncate">{run.target ?? "—"}</span>
                    <Badge variant="outline" className="rounded-full text-[11px]">
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4.5 text-accent" aria-hidden /> Data Source &amp; Consent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">What is read</p>
              <p className="mt-1">
                Public project titles, technologies and programming languages, public project
                descriptions, technical articles and public contribution metadata.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Never collected</p>
              <p className="mt-1">
                Private messages, contacts or connections, login credentials, sensitive personal
                attributes, political or religious information, and personal non-professional
                content.
              </p>
            </div>
            <div className="space-y-2 border-t border-border/70 pt-3">
              {CONSENT_ROWS.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`consent-${row.key}`} className="text-xs font-normal">
                    {row.label}
                  </Label>
                  <Switch
                    id={`consent-${row.key}`}
                    checked={Boolean(consent.data?.[row.key])}
                    disabled={consentMutation.isPending}
                    onCheckedChange={(value) => consentMutation.mutate({ [row.key]: value })}
                    aria-label={`Allow ${row.label}`}
                  />
                </div>
              ))}
            </div>
            <DisclosureNote>
              Public pages only, fetched server-side through the Apify connector. External sources are
              off until you allow them here, and can be deleted on Privacy &amp; Consent.
            </DisclosureNote>

          </CardContent>
        </Card>
      </div>
    </section>
  );
}
