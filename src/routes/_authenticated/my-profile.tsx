import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FolderGit2,
  Link2 as LinkIcon,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppPage } from "@/components/talent/page";
import { LoadingBlock, PageHeader, SectionHeading } from "@/components/talent/primitives";
import { ProfileMediaCard } from "@/components/talent/profile-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth/account";
import { employeeSkillsQuery, projectsQuery, skillsQuery } from "@/lib/talent/queries";

export const Route = createFileRoute("/_authenticated/my-profile")({
  head: () => ({
    meta: [
      { title: "Edit My Profile — SynapseTalent.ai" },
      {
        name: "description",
        content:
          "Update your role, department, bio, career goal, certifications, projects and declared skills.",
      },
      { property: "og:title", content: "Edit My Profile — SynapseTalent.ai" },
      {
        property: "og:description",
        content: "Keep your talent evidence current so your internal matches stay accurate.",
      },
    ],
  }),
  component: EditProfilePage,
});

const DEPARTMENTS = [
  "Engineering",
  "Data Science",
  "AI/ML",
  "Product",
  "Design",
  "Cloud/DevOps",
  "Cybersecurity",
  "Business Analytics",
  "Marketing",
  "Operations",
  "Unassigned",
];

function EditProfilePage() {
  const account = useAccount();
  const queryClient = useQueryClient();
  const employeeId = account.employee?.id;

  const projects = useQuery({ ...projectsQuery(employeeId ?? ""), enabled: Boolean(employeeId) });
  const mySkills = useQuery({
    ...employeeSkillsQuery(employeeId ?? ""),
    enabled: Boolean(employeeId),
  });
  const catalogue = useQuery(skillsQuery());

  const [form, setForm] = useState({
    name: "",
    department: "Unassigned",
    current_role: "",
    tenure_years: "0",
    bio: "",
    career_goal: "",
    career_goal_timeline: "",
    certifications: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", tech: "", role: "" });
  const [newSkill, setNewSkill] = useState({ skillId: "", proficiency: 70, evidence: "" });

  useEffect(() => {
    const employee = account.employee;
    if (!employee) return;
    setForm({
      name: employee.name,
      department: employee.department,
      current_role: employee.current_role,
      tenure_years: String(employee.tenure_years ?? 0),
      bio: employee.bio ?? "",
      career_goal: employee.career_goal ?? "",
      career_goal_timeline: employee.career_goal_timeline ?? "",
      certifications: (employee.certifications ?? []).join(", "),
    });
  }, [account.employee]);

  if (account.isLoading) {
    return (
      <AppPage>
        <LoadingBlock rows={3} />
      </AppPage>
    );
  }

  if (!employeeId) {
    return (
      <AppPage>
        <PageHeader
          eyebrow="Profile"
          title="No talent profile yet"
          description="Create your profile first, then come back to add your evidence."
        />
        <Button asChild>
          <Link to="/me">Create my profile</Link>
        </Button>
      </AppPage>
    );
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    await queryClient.invalidateQueries({ queryKey: ["employee-skills"] });
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    const { error } = await supabase
      .from("employees")
      .update({
        name: form.name.trim(),
        department: form.department,
        job_title: form.current_role.trim() || "Not set",
        tenure_years: Number(form.tenure_years) || 0,
        bio: form.bio.trim() || null,
        career_goal: form.career_goal.trim() || null,
        career_goal_timeline: form.career_goal_timeline.trim() || null,
        certifications: form.certifications
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      })
      .eq("id", employeeId);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    await refresh();
  };

  const addProject = async () => {
    if (!newProject.name.trim()) {
      toast.error("Give the project a name");
      return;
    }
    const { error } = await supabase.from("projects").insert({
      employee_id: employeeId,
      name: newProject.name.trim(),
      description: newProject.description.trim() || null,
      role: newProject.role.trim() || null,
      tech_stack: newProject.tech
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewProject({ name: "", description: "", tech: "", role: "" });
    toast.success("Project added");
    await refresh();
  };

  const removeProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  };

  const addSkill = async () => {
    if (!newSkill.skillId) {
      toast.error("Pick a skill");
      return;
    }
    const { error } = await supabase.from("employee_skills").insert({
      employee_id: employeeId,
      skill_id: newSkill.skillId,
      proficiency: newSkill.proficiency,
      confidence: 90,
      source: "declared",
      skill_type: "direct",
      evidence: newSkill.evidence.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewSkill({ skillId: "", proficiency: 70, evidence: "" });
    toast.success("Skill added");
    await refresh();
  };

  const removeSkill = async (id: string) => {
    const { error } = await supabase.from("employee_skills").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  };

  const declared = (mySkills.data ?? []).filter((skill) => skill.source === "declared");
  const owned = new Set((mySkills.data ?? []).map((skill) => skill.skill_id));

  return (
    <AppPage>
      <PageHeader
        eyebrow="My profile"
        title="Edit my talent profile"
        description="Everything here feeds your skill analysis and internal role matches — keep it accurate."
      >
        <Button asChild variant="outline">
          <Link to="/me">View my analysis</Link>
        </Button>
      </PageHeader>

      <form onSubmit={saveProfile} className="space-y-6">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Profile details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Current role</Label>
              <Input
                id="role"
                value={form.current_role}
                onChange={(event) => setForm({ ...form, current_role: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={form.department}
                onValueChange={(value) => setForm({ ...form, department: value })}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenure">Tenure (years)</Label>
              <Input
                id="tenure"
                type="number"
                min={0}
                step="0.5"
                value={form.tenure_years}
                onChange={(event) => setForm({ ...form, tenure_years: event.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Career goal</Label>
              <Input
                id="goal"
                placeholder="e.g. Senior AI Engineer"
                value={form.career_goal}
                onChange={(event) => setForm({ ...form, career_goal: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline">Goal timeline</Label>
              <Input
                id="timeline"
                placeholder="e.g. 12 months"
                value={form.career_goal_timeline}
                onChange={(event) => setForm({ ...form, career_goal_timeline: event.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="certs">Certifications (comma separated)</Label>
              <Input
                id="certs"
                value={form.certifications}
                onChange={(event) => setForm({ ...form, certifications: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={savingProfile}>
          {savingProfile ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Save profile
        </Button>
      </form>

      <section className="mt-10">
        <SectionHeading
          title="Picture and profile links"
          icon={LinkIcon}
          description="Add your public GitHub, LinkedIn, Slack and portfolio links so HR can analyse real evidence."
        />
        <ProfileMediaCard employee={account.employee!} />
      </section>



      <section className="mt-10">
        <SectionHeading
          title="My projects"
          icon={FolderGit2}
          description="Project evidence is the strongest signal for discovering hidden skills."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Add a project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Project name"
                value={newProject.name}
                onChange={(event) => setNewProject({ ...newProject, name: event.target.value })}
              />
              <Textarea
                rows={3}
                placeholder="What did you build and what was your contribution?"
                value={newProject.description}
                onChange={(event) =>
                  setNewProject({ ...newProject, description: event.target.value })
                }
              />
              <Input
                placeholder="Your role (e.g. Lead developer)"
                value={newProject.role}
                onChange={(event) => setNewProject({ ...newProject, role: event.target.value })}
              />
              <Input
                placeholder="Tech stack, comma separated"
                value={newProject.tech}
                onChange={(event) => setNewProject({ ...newProject, tech: event.target.value })}
              />
              <Button type="button" onClick={addProject}>
                <Plus className="size-4" aria-hidden /> Add project
              </Button>
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Recorded projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(projects.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects yet — add your first one to unlock richer analysis.
                </p>
              ) : (
                (projects.data ?? []).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{project.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {project.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(project.tech_stack ?? []).map((tech) => (
                          <Badge key={tech} variant="outline" className="rounded-full text-[11px]">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${project.name}`}
                      onClick={() => removeProject(project.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="My declared skills"
          icon={Sparkles}
          description="Declared skills are never overwritten by the AI analysis — hidden skills are added alongside them."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Add a skill</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={newSkill.skillId}
                onValueChange={(value) => setNewSkill({ ...newSkill, skillId: value })}
              >
                <SelectTrigger aria-label="Select a skill">
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {(catalogue.data ?? [])
                    .filter((skill) => !owned.has(skill.id))
                    .map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name} · {skill.category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label>Proficiency: {newSkill.proficiency}%</Label>
                <Slider
                  value={[newSkill.proficiency]}
                  min={20}
                  max={100}
                  step={5}
                  onValueChange={(value) =>
                    setNewSkill({ ...newSkill, proficiency: value[0] ?? 70 })
                  }
                />
              </div>
              <Textarea
                rows={2}
                placeholder="Evidence (where did you use this?)"
                value={newSkill.evidence}
                onChange={(event) => setNewSkill({ ...newSkill, evidence: event.target.value })}
              />
              <Button type="button" onClick={addSkill}>
                <Plus className="size-4" aria-hidden /> Add skill
              </Button>
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Declared skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {declared.length === 0 ? (
                <p className="text-sm text-muted-foreground">No declared skills yet.</p>
              ) : (
                declared.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(skill.proficiency)}% proficiency · {skill.category}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${skill.name}`}
                      onClick={() => removeSkill(skill.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </AppPage>
  );
}
