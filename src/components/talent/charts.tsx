import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SkillVector } from "@/lib/talent/matching";
import type { MatchResult, Role } from "@/lib/talent/types";

const AXIS = { fontSize: 11, fill: "var(--color-muted-foreground)" };

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  fontSize: 12,
};

export function SkillRadar({
  vector,
  role,
}: {
  vector: SkillVector;
  role: Role | null;
}) {
  const requirements = role?.required_skills ?? [];
  const fallback = Array.from(vector.entries())
    .sort((a, b) => b[1].proficiency - a[1].proficiency)
    .slice(0, 8)
    .map(([skill]) => ({ skill, proficiency: 75 }));

  const data = (requirements.length > 0 ? requirements : fallback).slice(0, 8).map((requirement) => ({
    skill: requirement.skill,
    you: Math.round(vector.get(requirement.skill)?.proficiency ?? 0),
    target: requirement.proficiency,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis dataKey="skill" tick={AXIS} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Your proficiency"
          dataKey="you"
          stroke="var(--color-accent)"
          fill="var(--color-accent)"
          fillOpacity={0.35}
        />
        <Radar
          name="Role requirement"
          dataKey="target"
          stroke="var(--color-primary)"
          fill="var(--color-primary)"
          fillOpacity={0.12}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function BeforeAfterChart({
  current,
  projected,
}: {
  current: MatchResult[];
  projected: MatchResult[];
}) {
  const data = projected.slice(0, 6).map((match) => ({
    role: match.roleTitle.replace(" Engineer", " Eng."),
    current: current.find((item) => item.roleId === match.roleId)?.matchScore ?? 0,
    projected: match.matchScore,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="role" tick={{ ...AXIS, fontSize: 10 }} interval={0} angle={-12} dy={8} />
        <YAxis domain={[0, 100]} tick={AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar name="Current readiness" dataKey="current" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        <Bar
          name="Projected readiness"
          dataKey="projected"
          fill="var(--color-accent)"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
