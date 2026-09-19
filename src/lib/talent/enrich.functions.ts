import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EnrichInput = z.object({
  employeeId: z.string().uuid(),
  source: z.enum(["github", "linkedin", "slack", "portfolio", "public_web"]),
  targetUrl: z.string().url().max(500),
});

export interface EnrichResult {
  status: "success" | "unavailable" | "blocked";
  notice: string;
  signals: string[];
  provider: string;
}

/**
 * enrich-profile — OPTIONAL public profile enrichment through Apify.
 *
 * Privacy rules enforced here:
 *  - public URLs only, http(s) only, no localhost / private hosts
 *  - requires the matching consent toggle for this employee
 *  - only professional signals are stored (languages, topics, project titles)
 *  - never passwords, private messages, contacts or inferred personal traits
 *
 * If Apify is not connected the demo continues on mock data.
 */
export const enrichProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EnrichInput.parse(input))
  .handler(async ({ data }): Promise<EnrichResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { scrapePublicUrl, matchCatalogueSignals, checkPublicUrl } = await import(
      "./scrape.server"
    );

    if (data.source === "slack") {
      return {
        status: "unavailable",
        notice:
          "Slack profiles are not publicly accessible, so nothing was fetched — using demo data. A connected Slack workspace would be required.",
        signals: [],
        provider: "apify",
      };
    }

    const invalid = checkPublicUrl(data.targetUrl);
    if (invalid) {
      return { status: "blocked", notice: invalid.notice, signals: [], provider: "apify" };
    }

    const consent = await supabaseAdmin
      .from("consent_settings")
      .select("github_enabled,portfolio_enabled,public_web_enabled")
      .eq("employee_id", data.employeeId)
      .maybeSingle();

    const allowed =
      data.source === "github"
        ? consent.data?.github_enabled
        : data.source === "portfolio"
          ? consent.data?.portfolio_enabled
          : consent.data?.public_web_enabled;

    if (!allowed) {
      return {
        status: "blocked",
        notice:
          "This employee has not consented to that enrichment source. Enable it in Privacy & Consent first.",
        signals: [],
        provider: "apify",
      };
    }

    const record = async (status: string, summary: Record<string, unknown> | null) => {
      const rawSummary = (summary ? JSON.parse(JSON.stringify(summary)) : null) as never;
      await supabaseAdmin.from("enrichment_runs").insert({
        employee_id: data.employeeId,
        provider: "apify",
        target: data.targetUrl,
        status,
        raw_summary: rawSummary,
      });
    };

    const outcome = await scrapePublicUrl(data.source, data.targetUrl);
    if (outcome.status !== "success") {
      await record(outcome.status === "blocked" ? "failed" : "unavailable", {
        reason: outcome.notice,
      });
      return {
        status: outcome.status,
        notice: `${outcome.notice} Using demo data.`,
        signals: [],
        provider: "apify",
      };
    }

    const catalogue = await supabaseAdmin.from("skills").select("name");
    const signals = matchCatalogueSignals(
      outcome.text,
      (catalogue.data ?? []).map((row) => row.name),
    );

    await record("success", {
      source: data.source,
      url: data.targetUrl,
      signals,
      title: outcome.title,
      collected_at: new Date().toISOString(),
      note: "Public page content only. No private data, contacts or messages collected.",
    });

    return {
      status: "success",
      notice:
        signals.length > 0
          ? `Public profile enrichment found ${signals.length} professional signals. Run Analyze Skills to fold them into the profile.`
          : "Public page fetched, but no professional signals matched the skill catalogue.",
      signals,
      provider: "apify",
    };
  });

const ConsentInput = z.object({
  employeeId: z.string().uuid(),
  github_enabled: z.boolean(),
  portfolio_enabled: z.boolean(),
  public_web_enabled: z.boolean(),
  ai_analysis_enabled: z.boolean(),
});

export const updateConsent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConsentInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { employeeId, ...flags } = data;
    const result = await supabaseAdmin
      .from("consent_settings")
      .upsert(
        { employee_id: employeeId, ...flags, updated_at: new Date().toISOString() },
        { onConflict: "employee_id" },
      )
      .select("github_enabled,portfolio_enabled,public_web_enabled,ai_analysis_enabled")
      .single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

/** Removes AI-generated and enrichment data for a demo profile. */
export const resetDemoProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ employeeId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("employee_skills")
      .delete()
      .eq("employee_id", data.employeeId)
      .in("source", ["ai_inferred", "github", "portfolio"]);
    await supabaseAdmin.from("enrichment_runs").delete().eq("employee_id", data.employeeId);
    await supabaseAdmin.from("career_roadmaps").delete().eq("employee_id", data.employeeId);
    return { ok: true };
  });
