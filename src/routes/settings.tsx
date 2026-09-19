import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MonitorSmartphone } from "lucide-react";

import { AppPage } from "@/components/talent/page";
import { DisclosureNote, PageHeader } from "@/components/talent/primitives";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/lib/talent/app-state";
import { employeesQuery } from "@/lib/talent/queries";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SynapseTalent.ai" },
      {
        name: "description",
        content: "Demo Mode, the active demo employee and environment details for SynapseTalent.ai.",
      },
      { property: "og:title", content: "Settings — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Control Demo Mode and the active fictional employee.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { employeeId, setEmployeeId, demoMode, setDemoMode } = useAppState();
  const employees = useQuery(employeesQuery());

  return (
    <AppPage>
      <PageHeader
        eyebrow="Settings"
        title="Environment"
        description="This build is a demonstration environment. Fictional employees, roles and evidence only."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MonitorSmartphone className="size-4.5 text-accent" aria-hidden /> Demo Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 p-4">
              <div>
                <Label htmlFor="demo-mode" className="text-sm font-medium">
                  Demo Mode
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  On by default: fictional data only, no external authentication, no real
                  organisation data.
                </p>
              </div>
              <Switch id="demo-mode" checked={demoMode} onCheckedChange={setDemoMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-select" className="text-sm font-medium">
                Active demo employee
              </Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {(employees.data ?? []).map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} · {employee.current_role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DisclosureNote>
              Switching Demo Mode off does not connect real HR systems in this build — it only hides
              the demo indicator.
            </DisclosureNote>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">About this build</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              SynapseTalent.ai discovers hidden and transferable skills, matches them to internal
              roles with transparent scoring, and simulates future career paths.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full">
                Deterministic scoring
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Evidence-based AI explanation
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Consent-gated enrichment
              </Badge>
            </div>
            <p className="text-xs">
              No graph neural network, federated learning or employee monitoring is used anywhere in
              this build.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
}
