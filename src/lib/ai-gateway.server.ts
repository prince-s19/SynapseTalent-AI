/**
 * Lovable AI Gateway access. Server-only: the key never reaches the browser.
 * The demo uses Gemini for skill extraction, roadmaps and the career assistant.
 */
export const GATEWAY_CHAT_MODEL = "google/gemini-3.8-flash";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AiGatewayError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "AiGatewayError";
  }
}

export async function callGateway(
  messages: ChatMessage[],
  options: { json?: boolean; model?: string } = {},
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new AiGatewayError("AI is not configured for this environment.", 401);
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? GATEWAY_CHAT_MODEL,
      messages,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[ai-gateway] ${response.status}: ${body}`);
    const friendly =
      response.status === 429
        ? "The AI service is busy right now. Try again in a moment."
        : response.status === 402
          ? "AI credits are exhausted for this workspace."
          : "The AI service could not complete this request.";
    throw new AiGatewayError(friendly, response.status);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new AiGatewayError("The AI service returned an empty response.", 502);
  }
  return content;
}

export function parseJsonResponse<T>(raw: string): T | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
