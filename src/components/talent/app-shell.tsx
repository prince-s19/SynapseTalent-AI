import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BrainCircuit,
  Compass,
  FlaskConical,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessagesSquare,
  Network,
  PencilLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth/account";
import { useAppState } from "@/lib/talent/app-state";
import {
  allProjectsQuery,
  employeesQuery,
  rolesQuery,
  skillsQuery,
} from "@/lib/talent/queries";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "My Talent Profile", icon: UserRound },
  { to: "/roles", label: "Internal Opportunities", icon: Compass },
  { to: "/skills", label: "Skill Intelligence", icon: Network },
  { to: "/career-simulator", label: "Career Simulator", icon: FlaskConical },
  { to: "/ai-assistant", label: "AI Career Assistant", icon: MessagesSquare },
  { to: "/hr-dashboard", label: "HR Talent Insights", icon: BrainCircuit },
  { to: "/privacy", label: "Privacy & Consent", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2 py-1">
      <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground shadow-sm">
        <Sparkles className="size-4.5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm font-semibold tracking-tight text-sidebar-foreground">
          SYNAPSETALENT.AI
        </span>
        <span className="block text-[11px] text-muted-foreground">
          Hidden skills, hidden opportunities
        </span>
      </span>
    </Link>
  );
}

const navItemClass =
  "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";
const navActiveProps = {
  className:
    "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm border-sidebar-border",
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const account = useAccount();

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-col gap-1" aria-label="Main navigation">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeProps={navActiveProps}
            className={navItemClass}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div>
        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {account.isHr ? "HR workspace" : "My workspace"}
        </p>
        <nav className="flex flex-col gap-1" aria-label="Account navigation">
          {account.user ? (
            account.isHr ? (
              <>
                <Link to="/hr" onClick={onNavigate} activeProps={navActiveProps} className={navItemClass}>
                  <BrainCircuit className="size-4.5 shrink-0" aria-hidden />
                  <span className="truncate">HR Workspace</span>
                </Link>
                <Link
                  to="/hr-dashboard"
                  onClick={onNavigate}
                  activeProps={navActiveProps}
                  className={navItemClass}
                >
                  <LayoutDashboard className="size-4.5 shrink-0" aria-hidden />
                  <span className="truncate">Talent Insights</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/me" onClick={onNavigate} activeProps={navActiveProps} className={navItemClass}>
                  <Sparkles className="size-4.5 shrink-0" aria-hidden />
                  <span className="truncate">My Skill Analysis</span>
                </Link>
                <Link
                  to="/my-profile"
                  onClick={onNavigate}
                  activeProps={navActiveProps}
                  className={navItemClass}
                >
                  <PencilLine className="size-4.5 shrink-0" aria-hidden />
                  <span className="truncate">Edit My Profile</span>
                </Link>
              </>
            )
          ) : (
            <Link to="/auth" onClick={onNavigate} activeProps={navActiveProps} className={navItemClass}>
              <LogIn className="size-4.5 shrink-0" aria-hidden />
              <span className="truncate">Employee / HR sign in</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}

function AccountMenu() {
  const account = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!account.user) {
    return (
      <Button asChild size="sm" className="gap-1.5">
        <Link to="/auth">
          <LogIn className="size-4" aria-hidden /> Sign in
        </Link>
      </Button>
    );
  }

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const label = account.employee?.name ?? account.email ?? "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[190px] gap-2">
          <span className="truncate">{label}</span>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {account.isHr ? "HR" : "Employee"}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {account.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {account.isHr ? (
          <DropdownMenuItem asChild>
            <Link to="/hr">HR workspace</Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link to="/me">My skill analysis</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/my-profile">Edit my profile</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DemoBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 rounded-full border-accent/40 bg-accent-soft text-[11px] font-semibold text-accent"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
      Demo Environment
    </Badge>
  );
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const employees = useQuery(employeesQuery());
  const roles = useQuery(rolesQuery());
  const skills = useQuery(skillsQuery());
  const projects = useQuery(allProjectsQuery());

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full max-w-xs justify-start gap-2 text-muted-foreground"
        aria-label="Search people, roles, skills and projects"
      >
        <Search className="size-4" aria-hidden />
        <span className="truncate text-sm">Search talent, roles, skills…</span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search people, roles, skills, projects…" />
        <CommandList>
          <CommandEmpty>No matches in the demo environment.</CommandEmpty>
          <CommandGroup heading="People">
            {(employees.data ?? []).slice(0, 40).map((employee) => (
              <CommandItem
                key={employee.id}
                value={`${employee.name} ${employee.current_role} ${employee.department}`}
                onSelect={() =>
                  go(() => navigate({ to: "/employee/$employeeId", params: { employeeId: employee.id } }))
                }
              >
                <UserRound className="size-4" aria-hidden />
                <span>{employee.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{employee.current_role}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Internal roles">
            {(roles.data ?? []).map((role) => (
              <CommandItem
                key={role.id}
                value={`${role.title} ${role.department}`}
                onSelect={() => go(() => navigate({ to: "/role/$roleId", params: { roleId: role.id } }))}
              >
                <Compass className="size-4" aria-hidden />
                <span>{role.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{role.department}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Skills">
            {(skills.data ?? []).map((skill) => (
              <CommandItem
                key={skill.id}
                value={`${skill.name} ${skill.category}`}
                onSelect={() => go(() => navigate({ to: "/skills", search: { q: skill.name } }))}
              >
                <Network className="size-4" aria-hidden />
                <span>{skill.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{skill.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Projects">
            {(projects.data ?? []).slice(0, 60).map((project) => (
              <CommandItem
                key={project.id}
                value={`${project.name} ${project.tech_stack?.join(" ") ?? ""}`}
                onSelect={() =>
                  go(() =>
                    navigate({
                      to: "/employee/$employeeId",
                      params: { employeeId: project.employee_id },
                    }),
                  )
                }
              >
                <FlaskConical className="size-4" aria-hidden />
                <span className="truncate">{project.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function EmployeeSelector() {
  const { employeeId, setEmployeeId } = useAppState();
  const employees = useQuery(employeesQuery());
  const options = employees.data ?? [];

  return (
    <Select value={employeeId} onValueChange={setEmployeeId}>
      <SelectTrigger className="h-9 w-[220px]" aria-label="Select demo employee">
        <SelectValue placeholder="Select employee" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {options.map((employee) => (
          <SelectItem key={employee.id} value={employee.id}>
            {employee.name} · {employee.current_role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Notifications() {
  const items = [
    "Hidden skill detected: Machine Learning (project evidence)",
    "New internal match: Senior AI Engineer",
    "Skill gap alert: MLOps below target proficiency",
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-4.5" aria-hidden />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-accent" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-semibold">Talent signals</p>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">Demo signals from fictional data.</p>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { employeeId } = useAppState();
  const employees = useQuery(employeesQuery());
  const current = useMemo(
    () => (employees.data ?? []).find((employee) => employee.id === employeeId),
    [employees.data, employeeId],
  );
  const initials = (current?.name ?? "ST")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto rounded-xl border border-sidebar-border bg-background/60 p-3">
          <DemoBadge />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Fictional employees and roles only. No real organisation data is used.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="mb-5">
                <Brand />
              </div>
              <NavList />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:block">
              <DemoBadge />
            </span>
            <Notifications />
            <span className="hidden sm:block">
              <EmployeeSelector />
            </span>
            <AccountMenu />
            <Link
              to="/profile"
              aria-label="Open my talent profile"
              className="rounded-full ring-offset-2 transition hover:opacity-90"
            >
              <Avatar className="size-9 border border-border">
                <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
          <div className="w-full sm:hidden">
            <EmployeeSelector />
          </div>
        </header>

        <main className={cn("mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8")}>{children}</main>
      </div>
    </div>
  );
}
