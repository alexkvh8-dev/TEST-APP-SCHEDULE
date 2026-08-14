import { formatMoney } from "../currency";
import type { PeriodRange } from "../periods";
import type { InsightPayload, PeriodStats } from "../types";

import * as anthropic from "./anthropic";
import * as gemini from "./gemini";
import { classifyByRules, coachByRules, insightByRules } from "./heuristics";
import { NEED_LEVELS } from "./prompts";
import type { ChatTurn, Classification, ProviderName } from "./types";

export { coachSystemPrompt, isObviouslyOffTopic, OFF_TOPIC_REPLY } from "./prompts";

/*
 * Provider selection.
 *
 * The app is designed to run entirely free: with no keys at all it uses the
 * local rules engine, which is fully functional. Adding a free Gemini key
 * upgrades every AI surface. Claude is supported but costs money, so it is
 * never selected implicitly over Gemini.
 *
 * Every entry point below falls back to the rules engine on any provider
 * failure — a rate limit or an outage must never lose an expense or break a
 * report.
 */
export function activeProvider(): ProviderName {
  const forced = process.env.AI_PROVIDER?.toLowerCase();

  if (forced === "rules" || forced === "none") return "rules";
  if (forced === "gemini") return gemini.hasGeminiKey() ? "gemini" : "rules";
  if (forced === "anthropic" || forced === "claude") {
    return anthropic.hasAnthropicKey() ? "anthropic" : "rules";
  }

  if (gemini.hasGeminiKey()) return "gemini";
  if (anthropic.hasAnthropicKey()) return "anthropic";
  return "rules";
}

/** Surfaced in Settings so it is obvious which engine is answering. */
export function providerLabel(): string {
  switch (activeProvider()) {
    case "gemini":
      return `Google Gemini (${gemini.GEMINI_MODEL}) — free tier`;
    case "anthropic":
      return `Claude (${anthropic.MODEL}) — paid`;
    default:
      return "Built-in rules — no API key, no cost";
  }
}

function isValidClassification(value: unknown): value is Classification {
  const candidate = value as Classification | null;
  return Boolean(
    candidate &&
      typeof candidate.category === "string" &&
      candidate.category.length > 0 &&
      NEED_LEVELS.includes(candidate.need_level),
  );
}

// ---------------------------------------------------------------------------

export async function classifyExpense(
  item: string,
  amount: number,
  currency: string,
  recentItems: string[] = [],
): Promise<Classification> {
  const provider = activeProvider();
  const rules = classifyByRules(item);
  if (provider === "rules") return rules;

  const amountLabel = formatMoney(amount, currency);

  try {
    const result =
      provider === "gemini"
        ? await gemini.classifyExpense(item, amountLabel, recentItems)
        : await anthropic.classifyExpense(item, amountLabel, recentItems);

    return isValidClassification(result) ? result : rules;
  } catch {
    // Rate limited, offline, or a bad response — the keyword match still
    // gives a usable label, and the user can correct it with one tap.
    return rules;
  }
}

export async function generateInsight(
  stats: PeriodStats,
  range: PeriodRange,
  history: { label: string; total: number }[] = [],
): Promise<InsightPayload> {
  const provider = activeProvider();
  const rules = insightByRules(stats, history);

  if (provider === "rules" || stats.count === 0) return rules;

  try {
    const result =
      provider === "gemini"
        ? await gemini.generateInsight(stats, range, history)
        : await anthropic.generateInsight(stats, range, history);

    return {
      headline: result.headline?.slice(0, 120) || rules.headline,
      verdict: result.verdict || rules.verdict,
      needs_pct: Math.min(100, Math.max(0, Math.round(result.needs_pct ?? rules.needs_pct))),
      could_have_saved: Math.max(0, result.could_have_saved ?? 0),
      tips: (result.tips ?? []).slice(0, 3),
      flagged: (result.flagged ?? []).slice(0, 3),
    };
  } catch {
    return rules;
  }
}

/**
 * Streams the coach's reply. `stats` backs the rules engine, which answers
 * whenever no provider is configured or the provider fails before producing
 * any text.
 */
export async function* streamCoach(
  context: string,
  turns: ChatTurn[],
  stats: PeriodStats,
): AsyncGenerator<string, void, unknown> {
  const provider = activeProvider();
  const lastUserMessage = [...turns].reverse().find((t) => t.role === "user")?.content ?? "";

  if (provider === "rules") {
    yield coachByRules(lastUserMessage, stats);
    return;
  }

  let produced = false;
  try {
    const stream =
      provider === "gemini"
        ? gemini.streamCoach(context, turns)
        : anthropic.streamCoach(context, turns);

    for await (const chunk of stream) {
      if (chunk) produced = true;
      yield chunk;
    }
  } catch {
    if (!produced) {
      // Nothing reached the user yet, so answer from the data instead of
      // showing an error.
      yield coachByRules(lastUserMessage, stats);
    } else {
      yield "\n\n(Cut off there — the free-tier limit may have been reached. Try again in a minute.)";
    }
    return;
  }

  if (!produced) yield coachByRules(lastUserMessage, stats);
}
