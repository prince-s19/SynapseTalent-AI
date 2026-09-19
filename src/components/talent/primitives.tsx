import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Info } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          {Icon ? <Icon className="size-5 text-accent" aria-hidden /> : null}
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  tone?: "default" | "accent" | "success";
}) {
  return (
    <Card className="surface-card border-border/70 transition-shadow duration-300 hover:shadow-lift">
      <CardContent className="flex items-start gap-4 p-5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            tone === "accent"
              ? "bg-accent-soft text-accent"
              : tone === "success"
                ? "bg-success/12 text-success"
                : "bg-primary-soft text-primary",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-display text-xl font-semibold text-foreground">{value}</p>
          {sublabel ? <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScoreDial({ score, size = 96 }: { score: number; size?: number }) {
  const radius = size / 2 - 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${score}% match`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={7}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-accent transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-semibold">
        {score}%
      </span>
    </div>
  );
}

export function ReadinessBadge({ readiness }: { readiness: string }) {
  const tone =
    readiness === "Ready now"
      ? "bg-success/12 text-success border-success/30"
      : readiness === "Ready in ~3 months"
        ? "bg-accent-soft text-accent border-accent/30"
        : readiness === "Developing"
          ? "bg-warning/15 text-warning-foreground border-warning/40"
          : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", tone)}>
      {readiness}
    </Badge>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const label: Record<string, string> = {
    declared: "Declared",
    project: "Project evidence",
    certification: "Certification",
    github: "Apify Public Enrichment",
    portfolio: "Apify Public Enrichment",
    public_web: "Apify Public Enrichment",
    ai_inferred: "AI inferred",
    simulated: "Simulated",
  };

  return (
    <Badge variant="secondary" className="rounded-full text-[11px] font-medium">
      {label[source] ?? source}
    </Badge>
  );
}

export function SkillTypeBadge({ type }: { type: string }) {
  if (type === "hidden") {
    return (
      <Badge className="rounded-full border-transparent bg-accent text-accent-foreground text-[11px]">
        Hidden Skill
      </Badge>
    );
  }
  if (type === "transferable") {
    return (
      <Badge variant="outline" className="rounded-full border-accent/40 text-accent text-[11px]">
        Transferable Skill
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full text-[11px]">
      Direct Skill
    </Badge>
  );
}

export function ProficiencyBar({
  label,
  value,
  required,
}: {
  label: string;
  value: number;
  required?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {Math.round(value)}%{required !== undefined ? ` / ${required}% required` : ""}
        </span>
      </div>
      <Progress value={Math.min(100, value)} className="h-2" />
    </div>
  );
}

export function EvidenceNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-border/70 bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      <span className="font-semibold text-foreground">Evidence: </span>
      {children}
    </p>
  );
}

export function DisclosureNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-foreground">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent-soft"
          >
            Try again
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 font-display text-2xl font-semibold text-foreground md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </header>
  );
}

export function RoleLink({ roleId, children }: { roleId: string; children: ReactNode }) {
  return (
    <Link
      to="/role/$roleId"
      params={{ roleId }}
      className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-primary"
    >
      {children}
      <ArrowUpRight className="size-4" aria-hidden />
    </Link>
  );
}
