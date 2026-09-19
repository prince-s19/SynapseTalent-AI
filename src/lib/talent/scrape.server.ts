/**
 * Server-only public-page scraping through the Apify connector.
 *
 * Privacy rules enforced here:
 *  - public http(s) URLs only, never private/local hosts
 *  - only professional signals are returned (project titles, technologies,
 *    languages, public descriptions, article titles)
 *  - never credentials, private messages, contacts, connections, follower
 *    counts, photos, locations or sensitive personal attributes
 */

export type ScrapeSource = "github" | "linkedin" | "slack" | "portfolio" | "public_web";

export interface ScrapeOutcome {
  status: "success" | "unavailable" | "blocked";
  notice: string;
  text: string;
  title: string | null;
}

/** Markdown/text of a crawled public page. */
function crawledPageText(items: Array<Record<string, unknown>>): string {
  return items
    .map((item) => (item["markdown"] as string) ?? (item["text"] as string) ?? "")
    .join("\n");
}

/**
 * Keeps ONLY public professional fields from a LinkedIn profile result:
 * headline, about text, listed skills, job titles + descriptions, projects,
 * certification names and education fields of study. Everything else the Actor
 * returns is deliberately dropped and never stored.
 */
function linkedInProfessionalText(items: Array<Record<string, unknown>>): string {
  const parts: string[] = [];
  const pushAll = (value: unknown, keys: string[]) => {
    if (!Array.isArray(value)) return;
    for (const entry of value) {
      if (typeof entry === "string") {
        parts.push(entry);
        continue;
      }
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      for (const key of keys) {
        const field = row[key];
        if (typeof field === "string") parts.push(field);
        else if (Array.isArray(field)) pushAll(field, ["name", "title"]);
      }
    }
  };

  for (const item of items) {
    if (typeof item["headline"] === "string") parts.push(item["headline"]);
    if (typeof item["about"] === "string") parts.push(item["about"]);
    pushAll(item["topSkills"], ["name", "title"]);
    pushAll(item["skills"], ["name", "title"]);
    pushAll(item["currentPosition"], ["position", "description", "skills"]);
    pushAll(item["experience"], ["position", "title", "description", "skills"]);
    pushAll(item["projects"], ["title", "description"]);
    pushAll(item["certifications"], ["title", "name"]);
    pushAll(item["education"], ["fieldOfStudy", "degree"]);
    pushAll(item["profileTopEducation"], ["fieldOfStudy", "degree"]);
  }
  return parts.filter(Boolean).join("\n");
}

export function checkPublicUrl(targetUrl: string): ScrapeOutcome | null {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return {
      status: "blocked",
      notice: "That link is not a valid web address.",
      text: "",
      title: null,
    };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      status: "blocked",
      notice: "Only public http(s) pages can be read.",
      text: "",
      title: null,
    };
  }
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/i.test(url.hostname)) {
    return {
      status: "blocked",
      notice: "Private and local addresses are never fetched.",
      text: "",
      title: null,
    };
  }
  return null;
}

/** Reads one public professional page. Never throws — the demo keeps working. */
export async function scrapePublicUrl(
  source: ScrapeSource,
  targetUrl: string,
): Promise<ScrapeOutcome> {
  if (source === "slack") {
    return {
      status: "unavailable",
      notice:
        "Slack profiles are not publicly accessible, so nothing was fetched. A connected Slack workspace would be required.",
      text: "",
      title: null,
    };
  }

  const blocked = checkPublicUrl(targetUrl);
  if (blocked) return blocked;

  const lovableKey = process.env["LOVABLE_API_KEY"];
  const apifyKey = process.env["APIFY_API_KEY"];
  if (!lovableKey || !apifyKey) {
    return {
      status: "unavailable",
      notice: "Public profile reading is not connected — using existing profile data.",
      text: "",
      title: null,
    };
  }

  const isLinkedIn = source === "linkedin";
  const actor = isLinkedIn
    ? "harvestapi~linkedin-profile-scraper"
    : "apify~website-content-crawler";
  const actorInput = isLinkedIn
    ? { queries: [targetUrl], profileScraperMode: "Profile details no email ($4 per 1k)" }
    : {
        startUrls: [{ url: targetUrl }],
        maxCrawlPages: 1,
        crawlerType: "cheerio",
        saveMarkdown: true,
      };

  try {
    const response = await fetch(
      `https://connector-gateway.lovable.dev/apify/acts/${actor}/run-sync-get-dataset-items?timeout=180`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": apifyKey,
        },
        body: JSON.stringify(actorInput),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`[scrape] gateway ${response.status}: ${body.slice(0, 400)}`);
      return {
        status: "unavailable",
        notice: `The public page could not be read (provider returned ${response.status}).`,
        text: "",
        title: null,
      };
    }

    const items = (await response.json()) as Array<Record<string, unknown>>;
    const text = (isLinkedIn ? linkedInProfessionalText(items) : crawledPageText(items)).slice(
      0,
      8000,
    );
    const title = isLinkedIn
      ? ((items[0]?.["headline"] as string | undefined) ?? null)
      : (((items[0]?.["metadata"] as { title?: string } | undefined)?.title ??
          (items[0]?.["title"] as string | undefined)) ??
        null);

    if (!text.trim()) {
      return {
        status: "unavailable",
        notice: "The page was reachable but contained no readable professional content.",
        text: "",
        title,
      };
    }

    return {
      status: "success",
      notice: "Public professional content read successfully.",
      text,
      title,
    };
  } catch (error) {
    console.error("[scrape]", error);
    return {
      status: "unavailable",
      notice: "The public page could not be read right now.",
      text: "",
      title: null,
    };
  }
}

/** Matches text against the skill catalogue. No inference beyond exact naming. */
export function matchCatalogueSignals(text: string, catalogue: string[]): string[] {
  return catalogue
    .filter((name) =>
      new RegExp(
        `(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`,
        "i",
      ).test(text),
    )
    .slice(0, 25);
}
