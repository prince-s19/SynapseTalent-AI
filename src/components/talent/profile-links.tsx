import { useQueryClient } from "@tanstack/react-query";
import { Github, Globe, Linkedin, Loader2, Save, Slack, Upload, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { initials, isStoragePointer, storagePointer, useAvatarUrl } from "@/lib/talent/avatar";
import type { Employee } from "@/lib/talent/types";
import { cn } from "@/lib/utils";

/** Avatar with a graceful initials fallback. */
export function ProfileAvatar({
  employee,
  size = 64,
  className,
}: {
  employee: Pick<Employee, "name" | "avatar_url">;
  size?: number;
  className?: string;
}) {
  const url = useAvatarUrl(employee.avatar_url);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/15 to-accent/15 text-sm font-semibold text-primary",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(employee.name) || <UserRound className="size-5" />}</span>
      )}
    </div>
  );
}

const LINKS = [
  { key: "github_url", label: "GitHub", icon: Github },
  { key: "linkedin_url", label: "LinkedIn", icon: Linkedin },
  { key: "slack_url", label: "Slack", icon: Slack },
  { key: "portfolio_url", label: "Portfolio", icon: Globe },
] as const;

/** Row of brand links shown on a profile. Only public links are ever stored. */
export function ProfileLinkIcons({
  employee,
  showEmpty = false,
}: {
  employee: Employee;
  showEmpty?: boolean;
}) {
  const items = LINKS.map((link) => ({ ...link, url: employee[link.key] ?? null })).filter(
    (link) => showEmpty || link.url,
  );
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((link) => {
        const Icon = link.icon;
        const content = (
          <>
            <Icon className="size-3.5" aria-hidden />
            {link.label}
          </>
        );
        return link.url ? (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {content}
          </a>
        ) : (
          <span
            key={link.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/70 px-3 py-1 text-xs text-muted-foreground"
          >
            {content}
            <span className="text-[10px]">not added</span>
          </span>
        );
      })}
    </div>
  );
}

/** Employee-facing editor for the profile picture and public profile links. */
export function ProfileMediaCard({ employee }: { employee: Employee }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState({
    github_url: "",
    linkedin_url: "",
    slack_url: "",
    portfolio_url: "",
  });

  useEffect(() => {
    setLinks({
      github_url: employee.github_url ?? "",
      linkedin_url: employee.linkedin_url ?? "",
      slack_url: employee.slack_url ?? "",
      portfolio_url: employee.portfolio_url ?? "",
    });
  }, [employee]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
  };

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please choose an image under 5 MB.");
      return;
    }
    setUploading(true);
    const { data: session } = await supabase.auth.getUser();
    const userId = session.user?.id;
    if (!userId) {
      setUploading(false);
      toast.error("Please sign in again.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${extension}`;
    const upserted = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upserted.error) {
      setUploading(false);
      toast.error(upserted.error.message);
      return;
    }
    const previous = employee.avatar_url;
    const { error } = await supabase
      .from("employees")
      .update({ avatar_url: storagePointer(path) })
      .eq("id", employee.id);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (previous && isStoragePointer(previous)) {
      await supabase.storage.from("avatars").remove([previous.replace("storage:", "")]);
    }
    toast.success("Profile picture updated");
    await refresh();
  };

  const saveLinks = async () => {
    const cleaned: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(links)) {
      const trimmed = value.trim();
      if (trimmed && !/^https?:\/\//i.test(trimmed)) {
        toast.error(`${key.replace("_url", "")} link must start with https://`);
        return;
      }
      cleaned[key] = trimmed || null;
    }
    setSaving(true);
    const { error } = await supabase
      .from("employees")
      .update(cleaned as never)
      .eq("id", employee.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile links saved — HR can now run an analysis on them.");
    await refresh();
  };

  return (
    <Card className="surface-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Picture and public profile links</CardTitle>
        <Badge variant="outline" className="rounded-full text-[11px]">
          Public information only
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <ProfileAvatar employee={employee} size={72} />
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              Upload picture
            </Button>
            <p className="text-xs text-muted-foreground">PNG or JPG, up to 5 MB.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label="Upload profile picture"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <div key={link.key} className="space-y-2">
                <Label htmlFor={link.key} className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {link.label}
                </Label>
                <Input
                  id={link.key}
                  inputMode="url"
                  placeholder={
                    link.key === "github_url"
                      ? "https://github.com/your-handle"
                      : link.key === "linkedin_url"
                        ? "https://www.linkedin.com/in/your-handle"
                        : link.key === "slack_url"
                          ? "https://yourworkspace.slack.com/team/U123"
                          : "https://your-portfolio.com"
                  }
                  value={links[link.key]}
                  onChange={(event) => setLinks({ ...links, [link.key]: event.target.value })}
                />
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          These links are visible to HR, who can run an evidence-based analysis on them. Only
          publicly accessible professional information is read — never private messages, contacts,
          credentials or personal attributes. Slack profiles are not public, so a Slack link is shown
          for reference but cannot be read without a connected workspace.
        </p>

        <Button type="button" onClick={saveLinks} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Save links
        </Button>
      </CardContent>
    </Card>
  );
}
