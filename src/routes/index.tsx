import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  FlaskConical,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SynapseTalent.ai — Where Hidden Skills Meet Hidden Opportunities" },
      {
        name: "description",
        content:
          "Internal talent intelligence that discovers hidden and transferable skills, matches people to internal roles with transparent evidence, and simulates future career paths.",
      },
      {
        property: "og:title",
        content: "SynapseTalent.ai — Where Hidden Skills Meet Hidden Opportunities",
      },
      {
        property: "og:description",
        content:
          "Discover what employees can actually do, not just what their job title says. Evidence-based matching, skill gaps and a career trajectory simulator.",
      },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: ScanSearch,
    title: "Hidden skill discovery",
    body: "Projects, certifications and consented public evidence reveal capabilities the job title hides.",
  },
  {
    icon: BrainCircuit,
    title: "Explainable internal matching",
    body: "Transparent hybrid scoring with strengths, transferable skills and gaps — every claim cites evidence.",
  },
  {
    icon: FlaskConical,
    title: "Career trajectory simulation",
    body: "See how learning specific skills changes projected readiness and unlocks new internal roles.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid-mesh">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
          <span className="flex items-center gap-2.5">
            <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground">
              <Sparkles className="size-4.5" aria-hidden />
            </span>
            <span className="font-display text-sm font-semibold tracking-tight">
              SYNAPSETALENT.AI
            </span>
          </span>
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-accent/40 bg-accent-soft text-[11px] font-semibold text-accent"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
            Demo Environment
          </Badge>
        </header>

        <section className="mx-auto max-w-4xl px-5 pb-20 pt-10 text-center md:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            KIT Buildathon 2026 · Internal Talent Intelligence
          </p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
            Where <span className="brand-gradient-text">hidden skills</span> meet hidden
            opportunities
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            SynapseTalent.ai discovers what your people can actually do — not just what their job
            title says — then matches them to internal roles with evidence, skill gaps and a
            month-by-month career plan.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/dashboard">
                Open the demo dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/career-simulator">Try the Career Simulator</Link>
            </Button>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            Fictional employees and roles only. No real organisation data, no sign-in required.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Card key={pillar.title} className="surface-card hover-lift border-border/70">
              <CardContent className="p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <pillar.icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold">{pillar.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
