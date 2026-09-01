import { formatMoney } from "../currency";
import type { InsightPayload, NeedLevel, PeriodStats } from "../types";

/*
 * The zero-cost engine.
 *
 * Everything here runs locally with no API key and no network call, so the app
 * is fully usable on a completely free stack. A configured AI provider replaces
 * these results with better ones; nothing here is a stub.
 *
 * Keywords cover English and common Roman-Urdu spellings, since that is how
 * people actually type expenses in Pakistan.
 */

interface Rule {
  category: string;
  need: NeedLevel;
  keywords: string[];
}

const RULES: Rule[] = [
  {
    category: "Rent & Housing",
    need: "need",
    keywords: ["rent", "kiraya", "kirya", "mortgage", "maintenance", "society charges", "landlord"],
  },
  {
    category: "Bills & Utilities",
    need: "need",
    keywords: [
      "bill", "electricity", "bijli", "k-electric", "wapda", "gas", "sui gas", "water", "pani",
      "internet", "wifi", "ptcl", "stormfiber", "recharge", "easyload", "load", "balance",
      "package", "jazz", "zong", "ufone", "telenor", "postpaid", "prepaid",
    ],
  },
  {
    category: "Food & Groceries",
    need: "need",
    keywords: [
      "grocery", "groceries", "kirana", "atta", "flour", "rice", "chawal", "daal", "dal", "lentil",
      "milk", "doodh", "bread", "double roti", "egg", "anda", "sabzi", "vegetable", "fruit", "phal",
      "meat", "gosht", "chicken", "murgi", "beef", "mutton", "fish", "machli", "oil", "ghee",
      "sugar", "cheeni", "salt", "namak", "masala", "spice", "yogurt", "dahi", "supermarket",
      "imtiaz", "metro", "carrefour", "utility store",
    ],
  },
  {
    category: "Transport",
    need: "need",
    keywords: [
      "petrol", "fuel", "diesel", "cng", "bus", "rickshaw", "taxi", "careem", "uber", "indrive",
      "bykea", "metro bus", "orange line", "train", "fare", "kiraya gari", "toll", "parking",
      "tyre", "oil change", "bike service", "car service", "mechanic",
    ],
  },
  {
    category: "Health",
    need: "need",
    keywords: [
      "medicine", "dawai", "dawa", "pharmacy", "doctor", "hospital", "clinic", "lab", "test",
      "checkup", "dental", "dentist", "surgery", "vaccine", "therapy", "spectacles", "glasses",
    ],
  },
  {
    category: "Education",
    need: "need",
    keywords: [
      "fee", "fees", "school", "college", "university", "tuition", "academy", "course", "exam",
      "book", "copy", "notebook", "stationery", "pen", "uniform", "admission",
    ],
  },
  {
    category: "Savings & Investment",
    need: "need",
    keywords: [
      "saving", "savings", "invest", "investment", "committee", "bc", "insurance", "premium",
      "loan", "qist", "installment", "emi", "repayment", "pension", "fund",
    ],
  },
  {
    category: "Family & Gifts",
    need: "unclear",
    keywords: [
      "gift", "tohfa", "salami", "eidi", "wedding", "shadi", "charity", "zakat", "sadqa",
      "donation", "family", "parents", "ammi", "abbu", "school fee kids",
    ],
  },
  {
    category: "Eating Out",
    need: "want",
    keywords: [
      "restaurant", "hotel food", "dine", "dinner out", "lunch out", "biryani", "pizza", "burger",
      "kfc", "mcdonald", "hardee", "broadway", "shawarma", "roll", "paratha roll", "karahi",
      "bbq", "tikka", "nihari", "haleem", "samosa", "pakora", "chaat", "cafe", "coffee",
      "starbucks", "tea", "chai", "juice", "shake", "ice cream", "dessert", "cake", "bakery",
      "foodpanda", "food panda", "snack", "chips", "biscuit", "chocolate", "soft drink", "coke",
      "pepsi", "sprite", "energy drink",
    ],
  },
  {
    category: "Entertainment",
    need: "want",
    keywords: [
      "movie", "cinema", "netflix", "spotify", "youtube premium", "subscription", "game", "gaming",
      "playstation", "xbox", "steam", "concert", "ticket", "outing", "trip", "picnic", "park",
      "arcade", "bowling", "cricket match", "pubg", "uc",
    ],
  },
  {
    category: "Shopping",
    need: "want",
    keywords: [
      "clothes", "kapre", "shirt", "jeans", "shoes", "joota", "sandal", "bag", "watch", "jewellery",
      "jewelry", "makeup", "lipstick", "perfume", "cosmetic", "salon", "haircut", "parlour",
      "mobile", "phone", "laptop", "headphone", "earbuds", "charger", "cover", "furniture",
      "decor", "toy", "daraz", "shopping",
    ],
  },
  {
    category: "Other",
    need: "want",
    keywords: ["cigarette", "cigarettes", "sigret", "vape", "paan", "gutka", "lottery", "bet"],
  },
];

/** Longer keywords win, so "school fee" beats a bare "fee". */
const SORTED_RULES = RULES.flatMap((rule) =>
  rule.keywords.map((keyword) => ({ keyword, category: rule.category, need: rule.need })),
).sort((a, b) => b.keyword.length - a.keyword.length);

export function classifyByRules(item: string): { category: string; need_level: NeedLevel } {
  const text = ` ${item.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")} `;

  for (const rule of SORTED_RULES) {
    if (text.includes(` ${rule.keyword} `) || text.includes(`${rule.keyword} `)) {
      return { category: rule.category, need_level: rule.need };
    }
  }

  return { category: "Other", need_level: "unclear" };
}

/**
 * Voice parsing without a model. Pulls the first number out of the sentence
 * and treats the words after "on" / "for" as the item, then runs the keyword
 * classifier over it. Good enough for "spent 500 on petrol"; anything more
 * conversational is why the AI path exists.
 */
export function parseVoiceByRules(transcript: string): {
  amount: number;
  item: string;
  category: string;
  need_level: NeedLevel;
  understood: boolean;
} {
  const text = transcript.trim();

  // Digits first, then spelled-out numbers for the common small cases.
  const digits = text.match(/(\d[\d,]*\.?\d*)/);
  let amount = digits ? Number(digits[1].replace(/,/g, "")) : 0;

  if (!amount) {
    const words: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
      nine: 9, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50,
      hundred: 100, thousand: 1000, sau: 100, hazaar: 1000, hazar: 1000,
    };
    for (const [word, value] of Object.entries(words)) {
      if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
        amount = value;
        break;
      }
    }
  }

  // "spent 500 on petrol for the bike" -> "petrol for the bike"
  const after = text.match(/\b(?:on|for|at)\s+(.{2,60})$/i);
  let item = after ? after[1] : text.replace(/(\d[\d,]*\.?\d*)/, "").trim();
  item = item
    .replace(/^(i\s+)?(just\s+)?(spent|paid|bought|kharch|kiya)\s+/i, "")
    .replace(/\b(rupees?|rs\.?|pkr|dollars?|usd|taka|riyal)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (item.length > 60) item = item.slice(0, 60).trim();

  const guess = classifyByRules(item || text);

  return {
    amount,
    item: item ? item[0].toUpperCase() + item.slice(1) : "Spend",
    category: guess.category,
    need_level: guess.need_level,
    understood: amount > 0,
  };
}

/**
 * A summary built purely from the numbers. Every sentence is a statement of
 * fact about the data, never an invented judgement — that is the honest thing
 * to do without a model, and it still tells you what you need to know.
 */
export function insightByRules(
  stats: PeriodStats,
  history: { label: string; total: number }[] = [],
): InsightPayload {
  const word = { daily: "day", weekly: "week", monthly: "month" }[stats.period];
  const money = (n: number) => formatMoney(n, stats.currency);

  if (stats.count === 0) {
    return {
      headline: `Nothing logged this ${word}`,
      verdict: "Add a few spends and this fills in automatically.",
      needs_pct: 0,
      could_have_saved: 0,
      tips: [],
      flagged: [],
    };
  }

  const classified = stats.needs_total + stats.wants_total;
  const needsPct = classified > 0 ? Math.round((stats.needs_total / classified) * 100) : 0;
  const deltaPct =
    stats.previous_total > 0
      ? Math.round(((stats.total - stats.previous_total) / stats.previous_total) * 100)
      : null;

  const top = stats.by_category[0];
  const topShare = top ? Math.round((top.total / stats.total) * 100) : 0;

  const headline = top
    ? `${money(stats.total)} this ${word}, most of it on ${top.category}`
    : `${money(stats.total)} across ${stats.count} purchases`;

  const verdictParts: string[] = [];
  if (classified > 0) {
    verdictParts.push(
      `${needsPct}% of what you classified went on needs; wants came to ${money(stats.wants_total)}.`,
    );
  }
  if (deltaPct !== null) {
    verdictParts.push(
      deltaPct === 0
        ? `That is level with the previous ${word}.`
        : `That is ${Math.abs(deltaPct)}% ${deltaPct > 0 ? "more" : "less"} than the previous ${word}.`,
    );
  }

  const tips: string[] = [];
  const covered = new Set<string>();

  if (top && topShare >= 35) {
    tips.push(`${top.category} took ${topShare}% of this ${word} — ${money(top.total)}.`);
    covered.add(top.category);
  }

  // Death by a thousand cuts, but only for a category the first tip did not
  // already cover — two tips about the same line item is just repetition.
  const repeated = stats.by_category.find(
    (c) => c.count >= 5 && c.category !== "Bills & Utilities" && !covered.has(c.category),
  );
  if (repeated) {
    tips.push(
      `${repeated.count} separate ${repeated.category} spends added up to ${money(repeated.total)}.`,
    );
    covered.add(repeated.category);
  }
  if (stats.wants_total > stats.needs_total && stats.wants_total > 0) {
    tips.push(`Wants outspent needs this ${word}. That gap is the easiest thing to move.`);
  }
  if (stats.unclear_total > 0 && tips.length < 3) {
    tips.push(`${money(stats.unclear_total)} is still unsorted — tap a badge to label it.`);
  }

  // Only the discretionary spends are counted as avoidable, and only the
  // largest few — claiming all of it was avoidable would not be honest.
  const flagged = stats.top_expenses.filter((e) => e.need_level === "want").slice(0, 3);

  return {
    headline: headline.slice(0, 110),
    verdict: verdictParts.join(" ") || `${stats.count} purchases this ${word}.`,
    needs_pct: needsPct,
    could_have_saved: Math.round(flagged.reduce((sum, e) => sum + e.amount, 0)),
    tips: tips.slice(0, 3),
    flagged: flagged.map((e) => ({
      item: e.item,
      amount: e.amount,
      why: "Logged as a want",
    })),
  };
}

/**
 * A coach that answers from the data rather than from a model. It handles the
 * questions people actually ask most, and says plainly when it cannot help.
 */
export function coachByRules(message: string, stats: PeriodStats): string {
  const money = (n: number) => formatMoney(n, stats.currency);
  const text = message.toLowerCase();
  const top = stats.by_category[0];

  if (stats.count === 0) {
    return "You have not logged any spending yet, so I have nothing to work from. Add a few purchases and ask me again.";
  }

  if (/\b(where|what).*(go|going|gone|spend|spent|most)\b/.test(text) || /top|biggest|category/.test(text)) {
    const lines = stats.by_category
      .slice(0, 4)
      .map((c) => `• ${c.category}: ${money(c.total)} (${c.count} purchases)`);
    return `Over the last 30 days, ${money(stats.total)} across ${stats.count} purchases:\n\n${lines.join("\n")}\n\n${top ? `${top.category} is your biggest line.` : ""}`;
  }

  if (/\b(save|saving|cut|reduce|less)\b/.test(text)) {
    const wantCats = stats.by_category.filter((c) =>
      ["Eating Out", "Entertainment", "Shopping"].includes(c.category),
    );
    if (wantCats.length) {
      const total = wantCats.reduce((s, c) => s + c.total, 0);
      return `Your discretionary spending is ${money(total)} — ${wantCats.map((c) => `${c.category} ${money(c.total)}`).join(", ")}. Halving the largest of those is the single biggest lever you have right now.`;
    }
    return `Most of your spending is on necessities (${money(stats.needs_total)} of ${money(stats.total)}). There is not much fat to cut — the win here would be finding cheaper suppliers for the big fixed costs, not trimming small treats.`;
  }

  if (/\b(need|want|necessary|reasonable|good|bad|ok|okay)\b/.test(text)) {
    const classified = stats.needs_total + stats.wants_total;
    const pct = classified > 0 ? Math.round((stats.needs_total / classified) * 100) : 0;
    return `Of what is classified, ${pct}% was needs (${money(stats.needs_total)}) and ${money(stats.wants_total)} was wants. ${pct >= 70 ? "That is a lean split — most of your money is doing necessary work." : "There is a meaningful discretionary share there, which is where any saving would come from."}`;
  }

  if (/\b(total|how much|spent)\b/.test(text)) {
    return `${money(stats.total)} across ${stats.count} purchases in the last 30 days.`;
  }

  return (
    `I can work from your numbers, but only for straightforward questions right now — ` +
    `try "where is my money going", "how can I save", or "how much have I spent".\n\n` +
    `For a real back-and-forth, add a free Gemini API key (see the README) and I can answer anything about your finances.`
  );
}
