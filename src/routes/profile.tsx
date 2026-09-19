import { createFileRoute } from "@tanstack/react-router";

import { EmployeeProfileView } from "@/components/talent/employee-profile";
import { AppPage } from "@/components/talent/page";
import { useAppState } from "@/lib/talent/app-state";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Talent Profile — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Declared skills, discovered hidden skills, project evidence, internal matches and the skill graph for the selected employee.",
      },
      { property: "og:title", content: "My Talent Profile — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Evidence-backed view of what this person can actually do.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { employeeId } = useAppState();
  return (
    <AppPage>
      <EmployeeProfileView employeeId={employeeId} />
    </AppPage>
  );
}
