import Anthropic from "@anthropic-ai/sdk";

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
 * Claude — optional. Anthropic has no free tier, so this only runs when
 * ANTHROPIC_API_KEY is set and AI_PROVIDER is not pointed elsewhere.
 */

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function firstText(content: Anthropic.ContentBlock[]): string {
  for (const block of content) if (block.type === "text") return block.text;
  return "";
}

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: [...CATEGORIES] },
    need_level: { type: "string", enum: [...NEED_LEVELS] },
  },
  required: ["category", "need_level"],
  additionalProperties: false,
} as const;

const INSIGHT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    verdict: { type: "string" },
    needs_pct: { type: "integer" },
    could_have_saved: { type: "number" },
    tips: { type: "array", items: { type: "string" } },
    flagged: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item: { type: "string" },
          amount: { type: "number" },
          why: { type: "string" },
        },
        required: ["item", "amount", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["headline", "verdict", "needs_pct", "could_have_saved", "tips", "flagged"],
  additionalProperties: false,
} as const;

export async function classifyExpense(
  item: string,
  amountLabel: string,
  recentItems: string[] = [],
): Promise<Classification> {
  const history = recentItems.length
    ? `\n\nRecent purchases by this person, for context:\n${recentItems.slice(0, 20).map((i) => `- ${i}`).join("\n")}`
    : "";

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: { type: "json_schema", schema: CLASSIFY_SCHEMA } },
    system: CLASSIFY_SYSTEM,
    messages: [{ role: "user", content: `Expense: "${item}" — ${amountLabel}${history}` }],
  });

  return JSON.parse(firstText(response.content)) as Classification;
}

export async function generateInsight(
  stats: PeriodStats,
  range: PeriodRange,
  history: { label: string; total: number }[],
): Promise<InsightPayload> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "medium", format: { type: "json_schema", schema: INSIGHT_SCHEMA } },
    system: [{ type: "text", text: INSIGHT_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: insightUserPrompt(stats, range, history) }],
  });

  return JSON.parse(firstText(response.content)) as InsightPayload;
}

export async function* streamCoach(
  context: string,
  turns: ChatTurn[],
): AsyncGenerator<string, void, unknown> {
  const stream = anthropic().messages.stream({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low" },
    system: [
      { type: "text", text: coachSystemPrompt(context), cache_control: { type: "ephemeral" } },
    ],
    messages: turns,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}
