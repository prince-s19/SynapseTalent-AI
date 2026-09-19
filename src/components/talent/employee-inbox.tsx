import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, FileText, Inbox, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionHeading } from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { respondToMobilityMessage } from "@/lib/talent/hr.functions";
import { hrReportsQuery, pipelineQuery, recognitionsQuery, rolesQuery } from "@/lib/talent/queries";

const RESPONSES = [
  { key: "interested", label: "I'm interested" },
  { key: "tell_me_more", label: "Tell me more" },
  { key: "not_now", label: "Not right now" },
] as const;

/** Employee-facing recognition, HR reports and internal mobility messages. */
export function EmployeeInbox({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();
  const recognitions = useQuery(recognitionsQuery(employeeId));
  const reports = useQuery(hrReportsQuery(employeeId));
  const pipeline = useQuery(pipelineQuery());
  const roles = useQuery(rolesQuery());
  const [note, setNote] = useState<Record<string, string>>({});

  const respond = useMutation({
    mutationFn: (input: {
      messageId: string;
      response: (typeof RESPONSES)[number]["key"];
      note?: string;
    }) => respondToMobilityMessage({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Your reply was sent to HR");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const myCandidates = (pipeline.data ?? []).filter((row) => row.employee_id === employeeId);
  const messages = myCandidates.flatMap((row) =>
    row.messages.map((message) => ({
      ...message,
      roleTitle:
        (roles.data ?? []).find((role) => role.id === row.role_id)?.title ?? "Internal role",
    })),
  );

  const hasAnything =
    (recognitions.data ?? []).length > 0 || (reports.data ?? []).length > 0 || messages.length > 0;

  return (
    <section className="mt-10">
      <SectionHeading
        title="From HR"
        icon={Inbox}
        description="Recognition, shared reports and internal mobility invitations."
      />
      {!hasAnything ? (
        <Card className="surface-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nothing from HR yet. Recognition badges, reports and internal opportunities will appear
            here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4 text-accent" aria-hidden /> Recognition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(recognitions.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No badges yet.</p>
              ) : (
                (recognitions.data ?? []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/70 bg-muted/30 p-3">
                    <Badge className="rounded-full">{item.badge}</Badge>
                    {item.message ? <p className="mt-2 text-sm">{item.message}</p> : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-accent" aria-hidden /> Reports from HR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(reports.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports shared yet.</p>
              ) : (
                (reports.data ?? []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/70 bg-muted/30 p-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.summary ? (
                      <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Internal opportunities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invitations yet.</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3"
                  >
                    <p className="text-sm font-semibold">{message.subject}</p>
                    <p className="text-sm text-muted-foreground">{message.body}</p>
                    <p className="text-[11px] text-muted-foreground">Role: {message.roleTitle}</p>
                    {message.response ? (
                      <Badge variant="outline" className="rounded-full text-[11px]">
                        You replied:{" "}
                        {RESPONSES.find((item) => item.key === message.response)?.label ??
                          message.response}
                      </Badge>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Add a note for HR (optional)"
                          value={note[message.id] ?? ""}
                          onChange={(event) =>
                            setNote({ ...note, [message.id]: event.target.value })
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          {RESPONSES.map((option) => (
                            <Button
                              key={option.key}
                              type="button"
                              size="sm"
                              variant={option.key === "interested" ? "default" : "outline"}
                              disabled={respond.isPending}
                              onClick={() =>
                                respond.mutate({
                                  messageId: message.id,
                                  response: option.key,
                                  ...(note[message.id]?.trim()
                                    ? { note: note[message.id]!.trim() }
                                    : {}),
                                })
                              }
                            >
                              {respond.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              ) : null}
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
