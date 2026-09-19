import { jsPDF } from "jspdf";

import type { LearningAction } from "@/lib/talent/analysis";
import type { EmployeeSkill, Employee, MatchResult, SkillGap } from "@/lib/talent/types";

export interface TalentReportInput {
  employee: Employee;
  skills: EmployeeSkill[];
  matches: MatchResult[];
  gaps: Array<SkillGap & { roleTitle: string }>;
  learningActions: LearningAction[];
  recognitions: Array<{ badge: string; message: string | null; created_at: string }>;
  /** HR reports additionally show match internals and evidence sources. */
  hrView: boolean;
  generatedFor: string;
}

const NAVY = [32, 40, 84] as const;
const PURPLE = [109, 62, 214] as const;
const GREY = [96, 102, 124] as const;

export function buildTalentReport(input: TalentReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - 64) return;
    doc.addPage();
    y = margin;
  };

  const heading = (text: string) => {
    ensureSpace(46);
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(text.toUpperCase(), margin, y);
    doc.setDrawColor(PURPLE[0], PURPLE[1], PURPLE[2]);
    doc.setLineWidth(1.2);
    doc.line(margin, y + 6, margin + 44, y + 6);
    y += 20;
  };

  const body = (text: string, options: { bold?: boolean; size?: number } = {}) => {
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    ensureSpace(lines.length * 14 + 6);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.size ?? 10);
    doc.setTextColor(40, 44, 66);
    doc.text(lines, margin, y);
    y += lines.length * 14;
  };

  const muted = (text: string) => {
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    ensureSpace(lines.length * 12 + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(lines, margin, y);
    y += lines.length * 12;
  };

  // Header band
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageWidth, 104, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("SynapseTalent.ai", margin, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 205, 236);
  doc.text(
    `${input.hrView ? "HR talent report" : "My talent report"} · generated ${new Date().toLocaleDateString()}`,
    margin,
    66,
  );
  doc.text("Demo environment — projected readiness, not guaranteed outcomes.", margin, 84);
  y = 134;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(input.employee.name, margin, y);
  y += 18;
  muted(
    `${input.employee.current_role} · ${input.employee.department} · ${input.employee.tenure_years} years tenure`,
  );
  if (input.employee.career_goal) muted(`Career goal: ${input.employee.career_goal}`);
  const links = [
    input.employee.github_url ? `GitHub: ${input.employee.github_url}` : null,
    input.employee.linkedin_url ? `LinkedIn: ${input.employee.linkedin_url}` : null,
    input.employee.portfolio_url ? `Portfolio: ${input.employee.portfolio_url}` : null,
  ].filter(Boolean) as string[];
  if (links.length > 0) muted(links.join("   "));

  if (input.employee.bio) {
    heading("Profile");
    body(input.employee.bio);
  }

  const declared = input.skills.filter((skill) => skill.source === "declared");
  const hidden = input.skills.filter((skill) => skill.skill_type === "hidden");
  const transferable = input.skills.filter((skill) => skill.skill_type === "transferable");

  heading("Declared skills");
  if (declared.length === 0) body("None recorded.");
  declared.forEach((skill) =>
    body(`• ${skill.name} — ${Math.round(skill.proficiency)}% proficiency`),
  );

  heading("Discovered hidden skills");
  if (hidden.length === 0) body("No hidden skills discovered yet.");
  hidden.forEach((skill) => {
    body(
      `• ${skill.name} — ${Math.round(skill.proficiency)}% proficiency, ${Math.round(skill.confidence)}% confidence`,
    );
    if (skill.evidence) muted(`   Evidence: ${skill.evidence}`);
    if (input.hrView) muted(`   Source: ${skill.source}`);
  });

  heading("Transferable skills");
  if (transferable.length === 0) body("None identified.");
  transferable.forEach((skill) => {
    body(`• ${skill.name} — transferable, ${Math.round(skill.confidence)}% confidence`);
    if (skill.evidence) muted(`   Evidence: ${skill.evidence}`);
  });

  heading("Recommended internal roles");
  if (input.matches.length === 0) body("No role matches available.");
  input.matches.slice(0, 5).forEach((match) => {
    body(
      `• ${match.roleTitle} — ${Math.round(match.matchScore)}% projected readiness (${match.readiness})`,
    );
    if (input.hrView) {
      muted(
        `   Semantic ${Math.round(match.semanticScore)}% · coverage ${Math.round(
          match.skillCoverageScore,
        )}% · transferable ${Math.round(match.transferableScore)}%`,
      );
    }
  });

  heading("Skill gaps");
  if (input.gaps.length === 0) body("No gaps identified against the strongest matches.");
  input.gaps.slice(0, 10).forEach((gap) =>
    body(
      `• ${gap.skill}: current ${Math.round(gap.current)}% vs required ${Math.round(gap.required)}% (${gap.roleTitle})`,
    ),
  );

  heading("Recommended learning actions");
  if (input.learningActions.length === 0) body("No learning actions recorded yet.");
  input.learningActions.forEach((action) => {
    body(`• ${action.skill} (${action.priority} priority) — ${action.action}`);
    muted(`   ${action.rationale}`);
  });

  heading("Recognition");
  if (input.recognitions.length === 0) body("No recognition recorded yet.");
  input.recognitions.forEach((item) => {
    body(`• ${item.badge} — ${new Date(item.created_at).toLocaleDateString()}`);
    if (item.message) muted(`   ${item.message}`);
  });

  heading("How to read this report");
  muted(
    "Role readiness uses transparent scoring: 60% semantic alignment, 30% required-skill coverage and 10% transferable-skill bonus. Confidence reflects how much evidence supports a skill: high means strong directly attributable evidence, medium means a single evidence item, low means indirect or adjacent evidence only. Explanations are evidence-based; this system does not implement graph neural networks, SHAP attribution or federated learning. Transferable skills indicate adjacency, not equivalence.",
  );

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(
      `SynapseTalent.ai demo environment · prepared for ${input.generatedFor} · page ${page} of ${pages}`,
      margin,
      pageHeight - 32,
    );
  }

  return doc;
}

export function downloadTalentReport(input: TalentReportInput) {
  const doc = buildTalentReport(input);
  const safeName = input.employee.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`synapsetalent-${safeName}-report.pdf`);
}
