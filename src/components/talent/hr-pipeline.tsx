import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  removePipelineCandidate,
  sendMobilityMessage,
  setPipelineStage,
  type PipelineStage,
} from "@/lib/talent/hr.functions";
import { employeesQuery, pipelineQuery, rolesQuery } from "@/lib/talent/queries";

const STAGES: Array<{ key: PipelineStage; label: string }> = [
  { key: "identified", label: "Identified" },
  { key: "contacted", label: "Contacted" },
  { key: "responded", label: "Responded" },
  { key: "interviewing", label: "Interviewing" },
  { key: "placed", label: "Placed" },
];

const RESPONSE_LABEL: Record<string, string> = {
  interested: "Interested",
  not_now: "Not now",
  tell_me_more: "Wants to know more",
};

/** Candidate pipeline board for internal mobility. */
export function PipelineBoard() {
  const queryClient = useQueryClient();
  const pipeline = useQuery(pipelineQuery());
  const employees = useQuery(employeesQuery());
  const roles = useQuery(rolesQuery());
  const [composing, setComposing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ subject: "", body: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pipeline"] });

  const stageMutation = useMutation({
    mutationFn: (input: { candidateId: string; stage: PipelineStage }) =>
      setPipelineStage({ data: input }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (candidateId: string) => removePipelineCandidate({ data: { candidateId } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Candidate removed from the pipeline");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const messageMutation = useMutation({
    mutationFn: (candidateId: string) =>
      sendMobilityMessage({
        data: { candidateId, subject: draft.subject.trim(), body: draft.body.trim() },
      }),
    onSuccess: async () => {
      setComposing(null);
      setDraft({ subject: "", body: "" });
      await invalidate();
      toast.success("Internal mobility message sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const nameOf = (employeeId: string) =>
    (employees.data ?? []).find((item) => item.id === employeeId)?.name ?? "Unknown";
  const roleOf = (roleId: string | null) =>
    roleId ? ((roles.data ?? []).find((item) => item.id === roleId)?.title ?? "Role") : "Role";

  if (pipeline.isLoading) {
    return (
      <Card className="surface-card">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading pipeline…</CardContent>
      </Card>
    );
  }

  const rows = pipeline.data ?? [];
  if (rows.length === 0) {
    return (
      <Card className="surface-card">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No candidates yet. Open a profile below and use “Add to pipeline” to start tracking someone
          for an internal role.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {STAGES.map((stage) => {
        const items = rows.filter((row) => row.stage === stage.key);
        return (
          <div key={stage.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stage.label}
              </p>
              <Badge variant="secondary" className="rounded-full text-[11px]">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {items.map((row) => {
                const latestMessage = row.messages[0];
                return (
                  <Card key={row.id} className="surface-card">
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <p className="text-sm font-semibold">{nameOf(row.employee_id)}</p>
                        <p className="text-xs text-muted-foreground">{roleOf(row.role_id)}</p>
                      </div>

                      {latestMessage ? (
                        <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5">
                          <p className="text-xs font-medium">{latestMessage.subject}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                            {latestMessage.body}
                          </p>
                          <p className="mt-1.5 text-[11px]">
                            {latestMessage.response ? (
                              <span className="font-medium text-accent">
                                Reply: {RESPONSE_LABEL[latestMessage.response] ?? latestMessage.response}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Awaiting reply</span>
                            )}
                          </p>
                          {latestMessage.response_note ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              “{latestMessage.response_note}”
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <Select
                        value={row.stage}
                        onValueChange={(value) =>
                          stageMutation.mutate({
                            candidateId: row.id,
                            stage: value as PipelineStage,
                          })
                        }
                      >
                        <SelectTrigger
                          aria-label={`Stage for ${nameOf(row.employee_id)}`}
                          className="h-9 text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((item) => (
                            <SelectItem key={item.key} value={item.key}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {composing === row.id ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Subject"
                            value={draft.subject}
                            onChange={(event) =>
                              setDraft({ ...draft, subject: event.target.value })
                            }
                          />
                          <Textarea
                            rows={3}
                            placeholder="Invite them to consider this internal role"
                            value={draft.body}
                            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (draft.subject.trim().length < 2 || draft.body.trim().length < 2) {
                                  toast.error("Add a subject and a message");
                                  return;
                                }
                                messageMutation.mutate(row.id);
                              }}
                              disabled={messageMutation.isPending}
                            >
                              {messageMutation.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Send className="size-3.5" aria-hidden />
                              )}
                              Send
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setComposing(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setComposing(row.id);
                              setDraft({
                                subject: `Internal opportunity: ${roleOf(row.role_id)}`,
                                body: `Hi ${nameOf(row.employee_id).split(" ")[0]}, your recent work suggests strong readiness for ${roleOf(row.role_id)}. Would you like to explore this internal move?`,
                              });
                            }}
                          >
                            <MessageSquare className="size-3.5" aria-hidden /> Message
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${nameOf(row.employee_id)} from pipeline`}
                            onClick={() => removeMutation.mutate(row.id)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                  Empty
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
