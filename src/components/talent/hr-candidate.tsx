import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BadgeCheck,
  BrainCircuit,
  FileText,
  Loader2,
  ScanSearch,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProfileAvatar, ProfileLinkIcons } from "@/components/talent/profile-links";
import { DownloadReportButton } from "@/components/talent/report-actions";
import { DisclosureNote, ReadinessBadge, SourceBadge } from "@/components/talent/primitives";
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
import { Textarea } from "@/components/ui/textarea";
import {
  addPipelineCandidate,
  analyzeProfileLinks,
  sendHrReport,
  sendRecognition,
  type ProfileAnalysisResult,
} from "@/lib/talent/hr.functions";
import { profileAnalysisQuery } from "@/lib/talent/queries";
import type { Employee, Role } from "@/lib/talent/types";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

const BADGES = [
  "Hidden Talent",
  "Systems Thinker",
  "AI Explorer",
  "Technical Mentor",
  "Problem Solver",
  "Delivery Champion",
];

const STATUS_TONE: Record<string, string> = {
  success: "border-emerald-500/40 text-emerald-600",
  unavailable: "border-amber-500/40 text-amber-600",
  blocked: "border-rose-500/40 text-rose-600",
  skipped: "border-border text-muted-foreground",
};

/** HR-only candidate workspace: link analysis, recognition, reports and pipeline. */
export function HrCandidatePanel({ employee, roles }: { employee: Employee; roles: Role[] }) {
  const queryClient = useQueryClient();
  const insights = useEmployeeInsights(employee.id);
  const stored = useQuery(profileAnalysisQuery(employee.id, true));
  const [result, setResult] = useState<ProfileAnalysisResult | null>(null);
  const [badge, setBadge] = useState(BADGES[0]!);
  const [recognitionNote, setRecognitionNote] = useState("");
  const [report, setReport] = useState({ title: "", summary: "" });
  const [pipelineRoleId, setPipelineRoleId] = useState("");

  const analyse = useMutation({
    mutationFn: () => analyzeProfileLinks({ data: { employeeId: employee.id } }),
    onSuccess: async (data) => {
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: ["employee-skills"] });
      await queryClient.invalidateQueries({ queryKey: ["all-employee-skills"] });
      await queryClient.invalidateQueries({ queryKey: ["enrichment-runs"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-analysis", employee.id] });
      toast.success("Profile analysis complete");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const recognise = useMutation({
    mutationFn: () =>
      sendRecognition({
        data: {
          employeeId: employee.id,
          badge,
          ...(recognitionNote.trim() ? { message: recognitionNote.trim() } : {}),
        },
      }),
    onSuccess: async () => {
      setRecognitionNote("");
      await queryClient.invalidateQueries({ queryKey: ["recognitions", employee.id] });
      toast.success(`${badge} sent to ${employee.name}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendReport = useMutation({
    mutationFn: () =>
      sendHrReport({
        data: {
          employeeId: employee.id,
          title: report.title.trim(),
          ...(report.summary.trim() ? { summary: report.summary.trim() } : {}),
          payload: {
            best_match: insights.matches[0]?.roleTitle ?? null,
            projected_readiness: insights.matches[0]
              ? Math.round(insights.matches[0].matchScore)
              : null,
          },
        },
      }),
    onSuccess: async () => {
      setReport({ title: "", summary: "" });
      await queryClient.invalidateQueries({ queryKey: ["hr-reports", employee.id] });
      toast.success("Report shared with the employee");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addToPipeline = useMutation({
    mutationFn: () =>
      addPipelineCandidate({ data: { employeeId: employee.id, roleId: pipelineRoleId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Added to the candidate pipeline");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const latest: ProfileAnalysisResult | null =
    result ?? ((stored.data?.analysis ?? null) as unknown as ProfileAnalysisResult | null);
  const best = insights.matches[0] ?? null;

  return (
    <div className="space-y-5">
      <Card className="surface-card">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-4">
            <ProfileAvatar employee={employee} size={64} />
            <div className="min-w-0 space-y-2">
              <div>
                <p className="text-base font-semibold">{employee.name}</p>
                <p className="text-xs text-muted-foreground">
                  {employee.current_role} · {employee.department} · {employee.tenure_years} yrs
                </p>
              </div>
              <ProfileLinkIcons employee={employee} showEmpty />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {best ? (
              <>
                <p className="text-sm">
                  <span className="font-display text-2xl font-semibold brand-gradient-text">
                    {Math.round(best.matchScore)}%
                  </span>{" "}
                  {best.roleTitle}
                </p>
                <ReadinessBadge readiness={best.readiness} />
              </>
            ) : (
              <Badge variant="secondary" className="rounded-full">
                No analysis yet
              </Badge>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => analyse.mutate()}
                disabled={analyse.isPending}
              >
                {analyse.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ScanSearch className="size-4" aria-hidden />
                )}
                Analyse profile links
              </Button>
              <DownloadReportButton
                employeeId={employee.id}
                hrView
                learningActions={latest?.learningActions ?? null}
                label="HR report PDF"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {analyse.isPending ? (
        <Card className="surface-card">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Reading this employee&apos;s public links and folding the evidence into their skill
            analysis…
          </CardContent>
        </Card>
      ) : null}

      {latest ? (
        <Card className="surface-card">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="size-4 text-accent" aria-hidden /> Link analysis (HR only)
            </CardTitle>
            <SourceBadge source="Apify Public Enrichment" />
          </CardHeader>
          <CardContent className="space-y-4">
            {latest.notice ? (
              <p className="rounded-xl border border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
                {latest.notice}
              </p>
            ) : null}
            {latest.summary ? <p className="text-sm">{latest.summary}</p> : null}

            <div className="grid gap-3 md:grid-cols-2">
              {(latest.sources ?? []).map((source) => (
                <div
                  key={source.source}
                  className="rounded-xl border border-border/70 bg-muted/30 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{source.source}</p>
                    <Badge
                      variant="outline"
                      className={`rounded-full text-[11px] ${STATUS_TONE[source.status] ?? ""}`}
                    >
                      {source.status === "success"
                        ? "Evidence found"
                        : source.status === "skipped"
                          ? "No link"
                          : source.status === "unavailable"
                            ? "Not readable"
                            : "Not allowed"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{source.notice}</p>
                  {source.signals.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {source.signals.map((signal) => (
                        <Badge key={signal} variant="secondary" className="rounded-full text-[11px]">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Insufficient evidence from this source.
                    </p>
                  )}
                </div>
              ))}
            </div>

            {(latest.learningActions ?? []).length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Recommended development actions</p>
                {latest.learningActions.map((action) => (
                  <div
                    key={`${action.skill}-${action.action}`}
                    className="rounded-xl border border-border/70 bg-card p-3"
                  >
                    <p className="text-sm font-medium">
                      {action.skill}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {action.priority} priority
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{action.action}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <DisclosureNote>
              Only publicly accessible professional information is read. Where a link returns nothing
              usable, this report says so rather than inferring skills. Explanations are
              evidence-based; no graph neural network, SHAP attribution or federated learning is used.
            </DisclosureNote>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="surface-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4 text-accent" aria-hidden /> Send recognition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Badge</Label>
              <Select value={badge} onValueChange={setBadge}>
                <SelectTrigger aria-label="Recognition badge">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BADGES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              rows={3}
              placeholder="Message to the employee (optional)"
              value={recognitionNote}
              onChange={(event) => setRecognitionNote(event.target.value)}
            />
            <Button
              type="button"
              onClick={() => recognise.mutate()}
              disabled={recognise.isPending}
            >
              {recognise.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <BadgeCheck className="size-4" aria-hidden />
              )}
              Send badge
            </Button>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-accent" aria-hidden /> Share a report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Report title"
              value={report.title}
              onChange={(event) => setReport({ ...report, title: event.target.value })}
            />
            <Textarea
              rows={4}
              placeholder="Summary the employee will see in their dashboard"
              value={report.summary}
              onChange={(event) => setReport({ ...report, summary: event.target.value })}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (report.title.trim().length < 2) {
                  toast.error("Give the report a title");
                  return;
                }
                sendReport.mutate();
              }}
              disabled={sendReport.isPending}
            >
              {sendReport.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <FileText className="size-4" aria-hidden />
              )}
              Send report
            </Button>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-accent" aria-hidden /> Add to pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={pipelineRoleId} onValueChange={setPipelineRoleId}>
              <SelectTrigger aria-label="Pipeline role">
                <SelectValue placeholder="Select an internal role" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Candidates start at “Identified”. Sending an internal mobility message moves them to
              “Contacted”.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!pipelineRoleId) {
                  toast.error("Pick a role first");
                  return;
                }
                addToPipeline.mutate();
              }}
              disabled={addToPipeline.isPending}
            >
              {addToPipeline.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <UserPlus className="size-4" aria-hidden />
              )}
              Add candidate
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
