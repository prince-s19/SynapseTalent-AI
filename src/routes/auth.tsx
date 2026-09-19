import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Loader2, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signInWithPassword, signUpWithRole, type AccountRole } from "@/lib/auth/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Employee and HR sign-in for SynapseTalent.ai. Create an account to manage your talent profile or open the HR workspace.",
      },
      { property: "og:title", content: "Sign in — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Separate workspaces for employees and HR teams.",
      },
    ],
  }),
  component: AuthPage,
});

function RoleTile({
  active,
  onClick,
  title,
  description,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: typeof UserRound;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 rounded-xl border p-4 text-left transition-all duration-200",
        active
          ? "border-accent bg-accent-soft shadow-lift"
          : "border-border bg-background hover:border-accent/50 hover:bg-muted/50",
      )}
    >
      <Icon className={cn("size-5", active ? "text-accent" : "text-muted-foreground")} aria-hidden />
      <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<AccountRole>("employee");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const afterAuth = async (chosen: AccountRole | null) => {
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
    navigate({ to: chosen === "hr" ? "/hr" : "/me" });
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await signInWithPassword(form.email.trim(), form.password);
      toast.success("Signed in");
      await afterAuth(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    setBusy(true);
    try {
      await signUpWithRole({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        role,
      });
      toast.success(role === "hr" ? "HR account created" : "Employee account created");
      await afterAuth(role);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <div className="grid-mesh pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <Sparkles className="size-4.5" aria-hidden />
          </span>
          <span className="font-display text-sm font-semibold tracking-tight">
            SYNAPSETALENT.AI
          </span>
        </Link>
        <div className="relative max-w-md">
          <h1 className="font-display text-3xl font-semibold leading-tight text-foreground">
            Where hidden skills meet hidden opportunities.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Employees manage their own talent profile and see evidence-backed internal matches. HR
            teams get a separate workspace with organisation-wide talent insights.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">
          Demo environment · fictional employees and roles only.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <Card className="surface-card w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-display text-xl">Welcome</CardTitle>
            <CardDescription>
              Sign in to your workspace, or create a new employee or HR account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Work email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={set("email")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={form.password}
                      onChange={set("password")}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="flex gap-3">
                    <RoleTile
                      active={role === "employee"}
                      onClick={() => setRole("employee")}
                      title="I'm an employee"
                      description="Build my talent profile"
                      icon={UserRound}
                    />
                    <RoleTile
                      active={role === "hr"}
                      onClick={() => setRole("hr")}
                      title="I'm HR"
                      description="Org talent insights"
                      icon={BrainCircuit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input id="signup-name" required value={form.name} onChange={set("name")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Work email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={set("email")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={set("password")}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    Create {role === "hr" ? "HR" : "employee"} account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Prefer to look around first?{" "}
              <Link to="/dashboard" className="font-medium text-accent hover:underline">
                Open the demo environment
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
