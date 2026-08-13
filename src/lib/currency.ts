export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  /** Decimal places shown in the UI. PKR amounts are usually whole rupees. */
  decimals: number;
}

/** PKR first — it is the default everywhere in this app. */
export const CURRENCIES: CurrencyMeta[] = [
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee", decimals: 0 },
  { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  { code: "GBP", symbol: "£", name: "British Pound", decimals: 2 },
  { code: "AED", symbol: "AED", name: "UAE Dirham", decimals: 2 },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal", decimals: 2 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimals: 2 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2 },
];

export const DEFAULT_CURRENCY = "PKR";

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currencyMeta(code: string): CurrencyMeta {
  return BY_CODE.get(code) ?? { code, symbol: code, name: code, decimals: 2 };
}

export function isSupportedCurrency(code: unknown): code is string {
  return typeof code === "string" && BY_CODE.has(code);
}

/** "Rs 1,250" / "$12.50" — compact enough for a phone screen. */
export function formatMoney(amount: number, code: string): string {
  const meta = currencyMeta(code);
  const value = amount.toLocaleString("en-US", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${meta.symbol}${meta.symbol.length > 1 ? " " : ""}${value}`;
}

/** "Rs 12.4k" — for axis ticks and stat tiles where space is tight. */
export function formatMoneyCompact(amount: number, code: string): string {
  const meta = currencyMeta(code);
  const abs = Math.abs(amount);
  const prefix = `${meta.symbol}${meta.symbol.length > 1 ? " " : ""}`;
  if (abs >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${prefix}${(amount / 1_000).toFixed(1)}k`;
  return `${prefix}${Math.round(amount)}`;
}
