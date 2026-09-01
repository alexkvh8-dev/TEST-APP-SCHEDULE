/**
 * The countries offered during onboarding, each carrying the currency and
 * timezone we should assume for it.
 *
 * Picking a country answers three questions at once, so the flow can ask one
 * thing instead of three. Both defaults stay editable in Settings afterwards —
 * a guess that is right most of the time beats a question everybody skips.
 *
 * Ordered with Pakistan first because that is who this was built for; the rest
 * are alphabetical. "Somewhere else" falls back to the browser's own timezone.
 */
export interface Country {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "PK", name: "Pakistan", currency: "PKR", timezone: "Asia/Karachi", flag: "🇵🇰" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai", flag: "🇦🇪" },
  { code: "AU", name: "Australia", currency: "AUD", timezone: "Australia/Sydney", flag: "🇦🇺" },
  { code: "CA", name: "Canada", currency: "CAD", timezone: "America/Toronto", flag: "🇨🇦" },
  { code: "IN", name: "India", currency: "INR", timezone: "Asia/Kolkata", flag: "🇮🇳" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", timezone: "Asia/Riyadh", flag: "🇸🇦" },
  { code: "GB", name: "United Kingdom", currency: "GBP", timezone: "Europe/London", flag: "🇬🇧" },
  { code: "US", name: "United States", currency: "USD", timezone: "America/New_York", flag: "🇺🇸" },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryByCode(code: string | null | undefined): Country | null {
  return code ? (BY_CODE.get(code) ?? null) : null;
}

export function isSupportedCountry(code: unknown): code is string {
  return typeof code === "string" && BY_CODE.has(code);
}

/** The country whose timezone matches this browser, if we offer one. */
export function guessCountry(timezone: string): Country | null {
  return COUNTRIES.find((c) => c.timezone === timezone) ?? null;
}
