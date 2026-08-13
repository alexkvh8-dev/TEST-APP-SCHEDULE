/**
 * Exchange rates.
 *
 * Every expense stores the rate that was used at entry time, so historical
 * totals never shift when rates move. This module only supplies "the rate
 * right now".
 *
 * It tries a free public endpoint first and falls back to a static table if
 * the network is unavailable (offline dev, locked-down deploy). The static
 * numbers are approximate — update them or wire in a paid feed if you need
 * accuracy for multi-currency reporting.
 */

/** Units of currency per 1 USD. Approximate, updated 2026-08. */
const STATIC_USD_RATES: Record<string, number> = {
  USD: 1,
  PKR: 278,
  EUR: 0.92,
  GBP: 0.78,
  AED: 3.67,
  SAR: 3.75,
  INR: 83.5,
  CAD: 1.36,
  AUD: 1.52,
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cache: { rates: Record<string, number>; fetchedAt: number } | null = null;

async function usdRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.rates;

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const body = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (body.result === "success" && body.rates && typeof body.rates.PKR === "number") {
        cache = { rates: { ...STATIC_USD_RATES, ...body.rates }, fetchedAt: Date.now() };
        return cache.rates;
      }
    }
  } catch {
    // Fall through to the static table — a stale rate beats a failed save.
  }

  cache = { rates: STATIC_USD_RATES, fetchedAt: Date.now() };
  return cache.rates;
}

/**
 * How many units of `to` one unit of `from` buys. Returns 1 for same-currency
 * and for any currency we have no rate for (the amount is then stored as-is).
 */
export async function getRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  const rates = await usdRates();
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return 1;
  return toRate / fromRate;
}

export async function convert(amount: number, from: string, to: string) {
  const rate = await getRate(from, to);
  return { rate, converted: Math.round(amount * rate * 100) / 100 };
}
