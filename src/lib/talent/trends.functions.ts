import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { curatedTrends, type IndustryTrend, type TrendsPayload } from "./trends";

const TrendsInput = z.object({
  employeeId: z.string().uuid(),
  refresh: z.boolean().optional(),
});

const TrendSchema = z.object({
  trends: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        why_it_matters: z.string(),
        suggested_step: z.string(),
        source_url: z.string().nullable().optional(),
        source_name: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

const TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Industry trends for the employee's own field.
 *
 * Public articles are searched server-side through the Firecrawl connector, then
 * summarised with Lovable AI and tied to the employee's identified skill gaps.
 * Results are cached for 12 hours. When search or AI is unavailable the feed
 * falls back to a curated trend set and says so.
 */
export const getIndustryTrends = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TrendsInput.parse(input))
  .handler(async ({ data }): Promise<TrendsPayload> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadEmployeeContext } = await import("./context.server");
    const { callGateway, parseJsonResponse } = await import("@/lib/ai-gateway.server");

    const context = await loadEmployeeContext(data.employeeId);
    const department = context.employee.department;
    const scopeKey = `employee:${data.employeeId}`;

    if (!data.refresh) {
      const cached = await supabaseAdmin
        .from("industry_trends_cache")
        .select("trends,source,fetched_at")
        .eq("scope_key", scopeKey)
        .maybeSingle();
      const row = cached.data;
      if (row && Date.now() - new Date(row.fetched_at).getTime() < TTL_MS) {
        return {
          trends: row.trends as unknown as IndustryTrend[],
          source: row.source === "live" ? "live" : "curated",
          fetchedAt: row.fetched_at,
          notice:
            row.source === "live"
              ? null
              : "Showing a curated trend set — live search was unavailable when this was built.",
          scope: department,
        };
      }
    }

    const fallback = (notice: string): TrendsPayload => ({
      trends: curatedTrends(department),
      source: "curated",
      fetchedAt: new Date().toISOString(),
      notice,
      scope: department,
    });

    const gapList = context.matches
      .slice(0, 3)
      .flatMap((match) => match.gaps.slice(0, 4).map((gap) => gap.skill))
      .filter((skill, index, list) => list.indexOf(skill) === index)
      .slice(0, 8);

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const firecrawlKey = process.env["FIRECRAWL_API_KEY"];

    let articles: Array<{ title: string; description: string; url: string }> = [];
    if (lovableKey && firecrawlKey) {
      try {
        const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": firecrawlKey,
          },
          body: JSON.stringify({
            query: `${department} industry skill trends 2026 ${gapList.slice(0, 4).join(" ")}`.trim(),
            limit: 8,
            tbs: "qdr:m",
          }),
        });
        if (!response.ok) {
          const body = await response.text();
          console.error(`[trends] firecrawl ${response.status}: ${body.slice(0, 300)}`);
        } else {
          const payload = (await response.json()) as {
            data?: Array<{ title?: string; description?: string; url?: string }>;
            web?: Array<{ title?: string; description?: string; url?: string }>;
          };
          const rows = payload.data ?? payload.web ?? [];
          articles = rows
            .filter((row) => row.url && (row.title || row.description))
            .map((row) => ({
              title: row.title ?? "",
              description: (row.description ?? "").slice(0, 400),
              url: row.url as string,
            }))
            .slice(0, 8);
        }
      } catch (error) {
        console.error("[trends] search failed", error);
      }
    }

    if (articles.length === 0) {
      const payload = fallback(
        "Live industry search was unavailable, so this shows a curated trend set for your field.",
      );
      await supabaseAdmin.from("industry_trends_cache").upsert(
        {
          scope_key: scopeKey,
          trends: JSON.parse(JSON.stringify(payload.trends)) as never,
          source: "curated",
          fetched_at: payload.fetchedAt,
        },
        { onConflict: "scope_key" },
      );
      return payload;
    }

    try {
      const raw = await callGateway(
        [
          {
            role: "system",
            content: [
              "You summarise industry trends for an internal talent development platform.",
              "Use ONLY the supplied search results. Never invent statistics, company names or sources.",
              "Return 5 or 6 trends. Each one ties to at least one of the employee's identified skill gaps when possible.",
              "why_it_matters must speak directly to this employee's situation and stay factual and neutral.",
              "suggested_step is one concrete, achievable action. Never promise promotions or outcomes.",
              "source_url must be copied verbatim from a supplied result, or null.",
              'Return JSON only: {"trends": [{"title", "summary", "why_it_matters", "suggested_step", "source_url", "source_name"}]}',
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `EMPLOYEE FIELD: ${department}`,
              `CURRENT ROLE: ${context.employee.current_role}`,
              gapList.length > 0 ? `IDENTIFIED SKILL GAPS: ${gapList.join(", ")}` : "",
              "",
              "SEARCH RESULTS:",
              ...articles.map(
                (article, index) =>
                  `${index + 1}. ${article.title} — ${article.description} (${article.url})`,
              ),
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        { json: true },
      );
      const parsed = TrendSchema.safeParse(parseJsonResponse<unknown>(raw));
      if (!parsed.success || parsed.data.trends.length === 0) {
        return fallback("The trend summary could not be read, so this shows a curated set.");
      }

      const allowedUrls = new Set(articles.map((article) => article.url));
      const trends: IndustryTrend[] = parsed.data.trends.slice(0, 6).map((trend) => ({
        title: trend.title,
        summary: trend.summary,
        whyItMatters: trend.why_it_matters,
        suggestedStep: trend.suggested_step,
        sourceUrl: trend.source_url && allowedUrls.has(trend.source_url) ? trend.source_url : null,
        sourceName: trend.source_name ?? null,
      }));

      const fetchedAt = new Date().toISOString();
      await supabaseAdmin.from("industry_trends_cache").upsert(
        {
          scope_key: scopeKey,
          trends: JSON.parse(JSON.stringify(trends)) as never,
          source: "live",
          fetched_at: fetchedAt,
        },
        { onConflict: "scope_key" },
      );

      return { trends, source: "live", fetchedAt, notice: null, scope: department };
    } catch (error) {
      console.error("[trends] summary failed", error);
      return fallback("The trend summary is unavailable right now, so this shows a curated set.");
    }
  });
