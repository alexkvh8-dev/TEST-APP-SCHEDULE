import {
  CATEGORIES,
  CLASSIFY_SYSTEM,
  INSIGHT_SYSTEM,
  NEED_LEVELS,
  coachSystemPrompt,
  insightUserPrompt,
} from "./prompts";
import type { PeriodRange } from "../periods";
import type { InsightPayload, PeriodStats } from "../types";
import type { ChatTurn, Classification } from "./types";

/*
 * Google Gemini via plain REST — the free-tier provider.
 *
 * No SDK: the two endpoints we need are a single fetch each, which keeps the
 * dependency list (and the install size) down.
 *
 * Free tier is roughly 10 requests/minute. That is ample for one person, but
 * every call here fails soft — a rate-limited classification just leaves the
 * expense unsorted rather than losing it.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Gemini's schema dialect is the OpenAPI subset, with upper-case type names. */
const CLASSIFY_SCHEMA = {
  type: "OBJECT",
  properties: {
    category: { type: "STRING", enum: [...CATEGORIES] },
    need_level: { type: "STRING", enum: [...NEED_LEVELS] },
  },
  required: ["category", "need_level"],
} as const;

const INSIGHT_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    verdict: { type: "STRING" },
    needs_pct: { type: "INTEGER" },
    could_have_saved: { type: "NUMBER" },
    tips: { type: "ARRAY", items: { type: "STRING" } },
    flagged: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          item: { type: "STRING" },
          amount: { type: "NUMBER" },
          why: { type: "STRING" },
        },
        required: ["item", "amount", "why"],
      },
    },
  },
  required: ["headline", "verdict", "needs_pct", "could_have_saved", "tips", "flagged"],
} as const;

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
}

function textOf(body: GeminiResponse): string {
  return (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

async function generateJson<T>(
  system: string,
  user: string,
  schema: unknown,
  options: { thinking?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const res = await fetch(`${BASE}/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        // Thinking is on by default on 2.5 models and burns free-tier tokens.
        // Simple classification does not need it; a period summary does.
        ...(options.thinking === false ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
  });

  const body = (await res.json()) as GeminiResponse;
  if (!res.ok) throw new Error(body.error?.message ?? `Gemini returned ${res.status}`);

  return JSON.parse(textOf(body)) as T;
}

export async function classifyExpense(
  item: string,
  amountLabel: string,
  recentItems: string[] = [],
): Promise<Classification> {
  const history = recentItems.length
    ? `\n\nRecent purchases by this person, for context:\n${recentItems.slice(0, 20).map((i) => `- ${i}`).join("\n")}`
    : "";

  return generateJson<Classification>(
    CLASSIFY_SYSTEM,
    `Expense: "${item}" — ${amountLabel}${history}`,
    CLASSIFY_SCHEMA,
    { thinking: false, timeoutMs: 15_000 },
  );
}

export async function generateInsight(
  stats: PeriodStats,
  range: PeriodRange,
  history: { label: string; total: number }[],
): Promise<InsightPayload> {
  return generateJson<InsightPayload>(
    INSIGHT_SYSTEM,
    insightUserPrompt(stats, range, history),
    INSIGHT_SCHEMA,
    { timeoutMs: 45_000 },
  );
}

// ---------------------------------------------------------------------------
// Voice — turn "spent 14 dollars on coffee with Dan" into an entry
// ---------------------------------------------------------------------------

const VOICE_SCHEMA = {
  type: "OBJECT",
  properties: {
    amount: { type: "NUMBER" },
    item: { type: "STRING" },
    category: { type: "STRING", enum: [...CATEGORIES] },
    need_level: { type: "STRING", enum: [...NEED_LEVELS] },
    day_offset: { type: "INTEGER" },
    understood: { type: "BOOLEAN" },
  },
  required: ["amount", "item", "category", "need_level", "day_offset", "understood"],
} as const;

export interface VoiceParse {
  amount: number;
  item: string;
  category: string;
  need_level: string;
  /** 0 = today, -1 = yesterday. */
  day_offset: number;
  understood: boolean;
}

export async function parseVoice(transcript: string, currency: string): Promise<VoiceParse> {
  return generateJson<VoiceParse>(
    "You turn a spoken sentence into one expense record for a budgeting app.\n" +
      `Amounts are in ${currency} unless the speaker names another currency.\n` +
      "Numbers may be spoken as words (\"fourteen\", \"sau\", \"do sau pachas\") — convert them.\n" +
      "item: a short natural label, 1-4 words, no amount in it. Keep the person's own " +
      "wording where you can (\"coffee with Dan\", not \"beverage purchase\").\n" +
      "day_offset: 0 for today or unspecified, -1 for yesterday, -2 for the day before.\n" +
      "understood: false if there is no clear amount, and set amount to 0.\n" +
      "Classify need vs want the same way you would any expense. Reply with JSON only.",
    `Spoken: "${transcript}"`,
    VOICE_SCHEMA,
    { thinking: false, timeoutMs: 20_000 },
  );
}

// ---------------------------------------------------------------------------
// Receipt — split a photo into individual lines
// ---------------------------------------------------------------------------

const RECEIPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    merchant: { type: "STRING" },
    currency_symbol: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          item: { type: "STRING" },
          amount: { type: "NUMBER" },
          category: { type: "STRING", enum: [...CATEGORIES] },
          need_level: { type: "STRING", enum: [...NEED_LEVELS] },
        },
        required: ["item", "amount", "category", "need_level"],
      },
    },
    total: { type: "NUMBER" },
    readable: { type: "BOOLEAN" },
  },
  required: ["merchant", "items", "total", "readable"],
} as const;

export interface ReceiptParse {
  merchant: string;
  items: { item: string; amount: number; category: string; need_level: string }[];
  total: number;
  readable: boolean;
}

export async function parseReceipt(
  base64: string,
  mimeType: string,
  currency: string,
): Promise<ReceiptParse> {
  const res = await fetch(`${BASE}/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text:
              "You read a photographed shop receipt and split it into individual purchases " +
              `for a budgeting app. Amounts are in ${currency}.\n` +
              "Return one entry per purchasable line. Skip subtotals, tax lines, discounts, " +
              "loyalty points and the total itself.\n" +
              "item: a readable name — expand obvious abbreviations (\"MILK 2L\" to \"Milk, 2L\").\n" +
              "Classify each line as a need or a want on its own merits: staple food, " +
              "household basics and medicine are needs; treats, magazines and " +
              "non-essentials are wants.\n" +
              "total: the receipt's printed total if visible, else the sum of your items.\n" +
              "readable: false if the photo is too blurry or is not a receipt — then return " +
              "an empty items array.\n" +
              "Reply with JSON only.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: "Split this receipt into individual entries." },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RECEIPT_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const body = (await res.json()) as GeminiResponse;
  if (!res.ok) throw new Error(body.error?.message ?? `Gemini returned ${res.status}`);

  return JSON.parse(textOf(body)) as ReceiptParse;
}

/** Streams the coach's reply as plain text chunks. */
export async function* streamCoach(
  context: string,
  turns: ChatTurn[],
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: coachSystemPrompt(context) }] },
      // Gemini names the assistant role "model".
      contents: turns.map((t) => ({
        role: t.role === "assistant" ? "model" : "user",
        parts: [{ text: t.content }],
      })),
      generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail.slice(0, 200) || `Gemini returned ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // The final element may be a partial line; keep it for the next chunk.
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const text = textOf(JSON.parse(payload) as GeminiResponse);
        if (text) yield text;
      } catch {
        // A partial JSON frame — the next chunk completes it.
      }
    }
  }
}
