import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadTalentReport } from "@/lib/reports/pdf";
import { buildSkillAnalysis, type LearningAction } from "@/lib/talent/analysis";
import { recognitionsQuery } from "@/lib/talent/queries";
import { useEmployeeInsights } from "@/lib/talent/use-insights";

/**
 * Downloads a PDF talent report. HR reports add match internals and evidence
 * sources; the employee version keeps the same skills, gaps and actions.
 */
export function DownloadReportButton({
  employeeId,
  hrView,
  learningActions,
  label = "Download PDF",
  variant = "outline",
}: {
  employeeId: string;
  hrView: boolean;
  learningActions?: LearningAction[] | null;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const insights = useEmployeeInsights(employeeId);
  const recognitions = useQuery(recognitionsQuery(employeeId));

  const handleClick = () => {
    if (!insights.employee) {
      toast.error("Profile is still loading — try again in a moment.");
      return;
    }
    const analysis = buildSkillAnalysis(insights.skills, insights.matches, learningActions ?? null);
    downloadTalentReport({
      employee: insights.employee,
      skills: insights.skills,
      matches: insights.matches,
      gaps: analysis.gaps,
      learningActions: analysis.learningActions,
      recognitions: (recognitions.data ?? []).map((item) => ({
        badge: item.badge,
        message: item.message,
        created_at: item.created_at,
      })),
      hrView,
      generatedFor: hrView ? "HR" : insights.employee.name,
    });
    toast.success("Report downloaded");
  };

  return (
    <Button type="button" variant={variant} onClick={handleClick} disabled={insights.isLoading}>
      <Download className="size-4" aria-hidden /> {label}
    </Button>
  );
}
