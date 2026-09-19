import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessagesSquare, Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppPage } from "@/components/talent/page";
import { DisclosureNote, PageHeader } from "@/components/talent/primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { askCareerAssistant } from "@/lib/talent/ai.functions";
import { useAppState } from "@/lib/talent/app-state";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Career Assistant — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Ask about your internal matches, skill gaps and next steps. Answers are grounded in your own recorded evidence.",
      },
      { property: "og:title", content: "AI Career Assistant — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Evidence-grounded career chat for the selected demo employee.",
      },
    ],
  }),
  component: AssistantPage,
});

const STARTERS = [
  "What roles am I ready for?",
  "Why am I a match for Senior AI Engineer?",
  "What skills am I missing?",
  "What should I learn next?",
  "How can I become a Cloud Engineer?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

function AssistantPage() {
  const { employeeId } = useAppState();
  const insights = useEmployeeInsights(employeeId);
  const ask = useServerFn(askCareerAssistant);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (question: string) =>
      ask({ data: { employeeId, question, history: messages.slice(-6) } }),
    onSuccess: (result) => {
      setMessages((previous) => [...previous, { role: "assistant", content: result.answer }]);
      if (result.notice) toast.warning(result.notice);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    },
    onError: () => toast.error("The assistant is unavailable right now. Please try again."),
  });

  const send = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || mutation.isPending) return;
    setMessages((previous) => [...previous, { role: "user", content: trimmed }]);
    setDraft("");
    mutation.mutate(trimmed);
  };

  return (
    <AppPage>
      <PageHeader
        eyebrow="AI Career Assistant"
        title="Ask SynapseTalent AI"
        description={`Grounded in ${insights.employee?.name ?? "the selected employee"}'s own skills, projects, matches and gaps. No other employee's information is used.`}
      />

      <Card className="surface-card">
        <CardContent className="flex h-[min(62vh,640px)] flex-col gap-4 p-5 md:p-6">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <MessagesSquare className="size-6" aria-hidden />
                </span>
                <p className="mt-4 font-display text-lg font-semibold">
                  Ask about your internal career
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Every answer cites the evidence behind it and says &ldquo;projected
                  readiness&rdquo; rather than promising an outcome.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 bg-muted/50 text-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {mutation.isPending ? (
              <div className="flex justify-start">
                <div className="w-64 space-y-2 rounded-2xl border border-border/70 bg-muted/50 p-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => send(starter)}
                disabled={mutation.isPending}
                className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
              >
                <Sparkles className="mr-1 inline size-3" aria-hidden />
                {starter}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
            className="flex gap-2"
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your matches, gaps or next steps…"
              aria-label="Your question"
            />
            <Button type="submit" disabled={mutation.isPending || !draft.trim()} className="gap-2">
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              Send
            </Button>
          </form>
          <DisclosureNote>
            Demo environment with fictional employees. Answers are evidence-based, never guaranteed
            outcomes.
          </DisclosureNote>
        </CardContent>
      </Card>
    </AppPage>
  );
}
