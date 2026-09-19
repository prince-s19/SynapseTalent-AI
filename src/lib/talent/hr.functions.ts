import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import type { LearningAction } from "./analysis";

const PIPELINE_STAGES = [
  "identified",
  "contacted",
  "responded",
  "interviewing",
  "placed",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

async function assertHr(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "hr",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This action is only available to HR accounts.");
}

/* ------------------------------------------------------------------ */
/* HR profile analysis from the employee's own public profile links     */
/* ------------------------------------------------------------------ */

export interface LinkSourceResult {
  source: string;
  url: string | null;
  status: "success" | "unavailable" | "blocked" | "skipped";
  notice: string;
  signals: string[];
}

export interface ProfileAnalysisResult {
  employeeId: string;
  createdAt: string;
  summary: string | null;
  sources: LinkSourceResult[];
  learningActions: LearningAction[];
  analyzed: number;
  notice: string | null;
}

export const analyzeProfileLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ employeeId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ProfileAnalysisResult> => {
    await assertHr(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { scrapePublicUrl, matchCatalogueSignals } = await import("./scrape.server");

    const employeeRes = await supabaseAdmin
      .from("employees")
      .select("id,name,github_url,linkedin_url,slack_url,portfolio_url,website_url")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (employeeRes.error) throw new Error(employeeRes.error.message);
    if (!employeeRes.data) throw new Error("That talent profile could not be found.");
    const employee = employeeRes.data as Record<string, string | null | undefined> & {
      name: string;
    };
    const link = (key: string): string | null => employee[key] ?? null;

    const catalogueRes = await supabaseAdmin.from("skills").select("name");
    const catalogue = (catalogueRes.data ?? []).map((row) => row.name);

    const targets: Array<{ source: "github" | "linkedin" | "slack" | "portfolio"; url: string | null; label: string }> = [
      { source: "github", url: link("github_url"), label: "GitHub" },
      { source: "linkedin", url: link("linkedin_url"), label: "LinkedIn" },
      { source: "slack", url: link("slack_url"), label: "Slack" },
      {
        source: "portfolio",
        url: link("portfolio_url") ?? link("website_url"),
        label: "Portfolio",
      },
    ];

    const sources: LinkSourceResult[] = [];
    let anyText = false;

    for (const target of targets) {
      if (!target.url) {
        sources.push({
          source: target.label,
          url: null,
          status: "skipped",
          notice: `No ${target.label} link on this profile, so nothing was read.`,
          signals: [],
        });
        continue;
      }
      const outcome = await scrapePublicUrl(target.source, target.url);
      const signals =
        outcome.status === "success" ? matchCatalogueSignals(outcome.text, catalogue) : [];
      if (outcome.status === "success" && signals.length > 0) anyText = true;

      sources.push({
        source: target.label,
        url: target.url,
        status: outcome.status,
        notice:
          outcome.status === "success" && signals.length === 0
            ? "Page read successfully, but nothing matched the skill catalogue — no skills were added."
            : outcome.notice,
        signals,
      });

      if (outcome.status === "success" && signals.length > 0) {
        await supabaseAdmin.from("enrichment_runs").insert({
          employee_id: data.employeeId,
          provider: "apify",
          target: target.url,
          status: "success",
          raw_summary: JSON.parse(
            JSON.stringify({
              source: target.source,
              url: target.url,
              signals,
              title: outcome.title,
              requested_by: "hr",
              collected_at: new Date().toISOString(),
              note: "Public page content only. No private data, contacts or messages collected.",
            }),
          ) as never,
        });
      }
    }

    // Fold the collected evidence into the evidence-constrained skill analysis.
    const { analyzeEmployeeInternal } = await import("./analyze.server");
    const run = await analyzeEmployeeInternal(data.employeeId, { ignoreConsent: true });

    const record = await supabaseAdmin
      .from("profile_analyses")
      .insert({
        employee_id: data.employeeId,
        generated_by: (context as { userId: string }).userId,
        analysis: JSON.parse(
          JSON.stringify({
            summary: run.summary,
            hiddenSkills: run.hiddenSkills,
            learningActions: run.learningActions,
            updated: run.updated,
            aiSource: run.source,
          }),
        ) as never,
        sources: JSON.parse(JSON.stringify(sources)) as never,
      })
      .select("created_at")
      .single();

    const notice = anyText
      ? run.notice
      : [
          "No public professional evidence could be read from the saved links.",
          run.notice,
        ]
          .filter(Boolean)
          .join(" ");

    return {
      employeeId: data.employeeId,
      createdAt: record.data?.created_at ?? new Date().toISOString(),
      summary: run.summary,
      sources,
      learningActions: run.learningActions,
      analyzed: run.updated,
      notice: notice || null,
    };
  });

/* ------------------------------------------------------------------ */
/* Candidate pipeline                                                   */
/* ------------------------------------------------------------------ */

export const addPipelineCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: z.string().uuid(),
        roleId: z.string().uuid(),
        notes: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertHr(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin
      .from("pipeline_candidates")
      .upsert(
        {
          employee_id: data.employeeId,
          role_id: data.roleId,
          notes: data.notes ?? null,
          created_by: (context as { userId: string }).userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id,role_id" },
      )
      .select("id,stage")
      .single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const setPipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ candidateId: z.string().uuid(), stage: z.enum(PIPELINE_STAGES) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertHr(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin
      .from("pipeline_candidates")
      .update({ stage: data.stage, updated_at: new Date().toISOString() })
      .eq("id", data.candidateId);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });

export const removePipelineCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ candidateId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertHr(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("pipeline_candidates").delete().eq("id", data.candidateId);
    return { ok: true };
  });

export const sendMobilityMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        candidateId: z.string().uuid(),
        subject: z.string().min(2).max(160),
        body: z.string().min(2).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertHr(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const inserted = await supabaseAdmin.from("mobility_messages").insert({
      candidate_id: data.candidateId,
      subject: data.subject,
      body: data.body,
      sent_by: (context as { userId: string }).userId,
    });
    if (inserted.error) throw new Error(inserted.error.message);
    await supabaseAdmin
      .from("pipeline_candidates")
      .update({ stage: "contacted", updated_at: new Date().toISOString() })
      .eq("id", data.candidateId)
      .eq("stage", "identified");
    return { ok: true };
  });

/** Employee-side reply. The employee may only answer their own message. */
export const respondToMobilityMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        response: z.enum(["interested", "not_now", "tell_me_more"]),
        note: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as { userId: string }).userId;

    const message = await supabaseAdmin
      .from("mobility_messages")
      .select("id,candidate_id,pipeline_candidates(employee_id,employees(user_id))")
      .eq("id", data.messageId)
      .maybeSingle();
    if (message.error) throw new Error(message.error.message);
    const owner = (message.data as unknown as {
      candidate_id: string;
      pipeline_candidates?: { employees?: { user_id?: string | null } | null } | null;
    } | null);
    if (!owner || owner.pipeline_candidates?.employees?.user_id !== userId) {
      throw new Error("That message does not belong to your profile.");
    }

    const update = await supabaseAdmin
      .from("mobility_messages")
      .update({
        response: data.response,
        response_note: data.note ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", data.messageId);
    if (update.error) throw new Error(update.error.message);

    await supabaseAdmin
      .from("pipeline_candidates")
      .update({ stage: "responded", updated_at: new Date().toISOString() })
      .eq("id", owner.candidate_id)
      .in("stage", ["identified", "contacted"]);

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Recognition and reports                                              */
/* ------------------------------------------------------------------ */

export const sendRecognition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: z.string().uuid(),
        badge: z.string().min(2).max(80),
        message: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertHr(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.from("recognitions").insert({
      employee_id: data.employeeId,
      badge: data.badge,
      message: data.message ?? null,
      awarded_by: (context as { userId: string }).userId,
    });
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });

export const sendHrReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: z.string().uuid(),
        title: z.string().min(2).max(160),
        summary: z.string().max(4000).optional(),
        payload: z.record(z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertHr(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.from("hr_reports").insert({
      employee_id: data.employeeId,
      title: data.title,
      summary: data.summary ?? null,
      payload: JSON.parse(JSON.stringify(data.payload ?? {})) as never,
      created_by: (context as { userId: string }).userId,
    });
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });
