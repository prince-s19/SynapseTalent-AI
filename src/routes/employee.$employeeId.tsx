import { createFileRoute } from "@tanstack/react-router";

import { EmployeeProfileView } from "@/components/talent/employee-profile";
import { AppPage } from "@/components/talent/page";

export const Route = createFileRoute("/employee/$employeeId")({
  head: () => ({
    meta: [
      { title: "Talent Profile — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Discovered skills, project evidence and internal role matches for a fictional demo employee.",
      },
      { property: "og:title", content: "Talent Profile — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Evidence-backed internal talent profile from the SynapseTalent.ai demo.",
      },
    ],
  }),
  component: EmployeePage,
});

function EmployeePage() {
  const { employeeId } = Route.useParams();
  return (
    <AppPage>
      <EmployeeProfileView employeeId={employeeId} />
    </AppPage>
  );
}
