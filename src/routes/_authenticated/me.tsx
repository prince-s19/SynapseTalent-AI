import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Loader2, PencilLine, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmployeeInbox } from "@/components/talent/employee-inbox";
import { EmployeeProfileView } from "@/components/talent/employee-profile";
import { AppPage } from "@/components/talent/page";
import { LoadingBlock, PageHeader } from "@/components/talent/primitives";
import { ProfileAvatar, ProfileLinkIcons } from "@/components/talent/profile-links";
import { DownloadReportButton } from "@/components/talent/report-actions";
import { IndustryTrendsFeed } from "@/components/talent/trends-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureEmployeeRecord, useAccount } from "@/lib/auth/account";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "My Skill Analysis — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Your own evidence-backed skill analysis: discovered hidden skills, internal role matches, gaps and readiness.",
      },
      { property: "og:title", content: "My Skill Analysis — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Your personal talent analysis inside SynapseTalent.ai.",
      },
    ],
  }),
  component: MyAnalysisPage,
});

function MyAnalysisPage() {
  const account = useAccount();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (account.isLoading) {
    return (
      <AppPage>
        <LoadingBlock rows={3} />
      </AppPage>
    );
  }

  if (account.isHr) {
    return (
      <AppPage>
        <PageHeader
          eyebrow="HR account"
          title="This area is for employees"
          description="Your account is an HR account, so your workspace is the organisation-wide talent view."
        />
        <Card className="surface-card max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="size-4.5 text-accent" aria-hidden /> Open HR workspace
            </CardTitle>
            <CardDescription>
              Review every talent profile, hidden-talent alerts and organisation skill gaps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/hr">Go to HR workspace</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPage>
    );
  }

  if (!account.employee) {
    const createProfile = async () => {
      if (!account.userId || !account.email) return;
      setBusy(true);
      try {
        await ensureEmployeeRecord({
          userId: account.userId,
          email: account.email,
          name: account.email.split("@")[0] ?? "New employee",
        });
        await queryClient.invalidateQueries({ queryKey: ["auth"] });
        await queryClient.invalidateQueries({ queryKey: ["employees"] });
        toast.success("Talent profile created");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create your profile");
      } finally {
        setBusy(false);
      }
    };

    return (
      <AppPage>
        <PageHeader
          eyebrow="Getting started"
          title="Create your talent profile"
          description="Your analysis is built from your role, projects, certifications and skills. Start with a profile, then add your evidence."
        />
        <Card className="surface-card max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4.5 text-accent" aria-hidden /> One click to begin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={createProfile} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Create my profile
            </Button>
          </CardContent>
        </Card>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <ProfileAvatar employee={account.employee} size={40} className="rounded-xl" />
          <div>
            <p className="text-sm font-medium">{account.employee.name}</p>
            <p className="text-xs text-muted-foreground">Employee workspace</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProfileLinkIcons employee={account.employee} />
          <DownloadReportButton
            employeeId={account.employee.id}
            hrView={false}
            label="Download my report"
          />
          <Button asChild variant="outline" size="sm">
            <Link to="/my-profile">
              <PencilLine className="size-4" aria-hidden /> Edit my profile
            </Link>
          </Button>
        </div>
      </div>
      <EmployeeProfileView employeeId={account.employee.id} />
      <EmployeeInbox employeeId={account.employee.id} />
      <IndustryTrendsFeed employeeId={account.employee.id} />
    </AppPage>
  );
}
