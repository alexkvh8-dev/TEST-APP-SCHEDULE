/**
 * The password policy, in one place so the form and the server agree.
 *
 * Rules are checked and reported individually rather than as one "password not
 * strong enough" — a rule you cannot see is a rule you cannot satisfy, and the
 * usual result is people appending "1!" until it goes green.
 *
 * The length floor is 10, not 8: length buys more against offline cracking than
 * any character class does, and a 10-character passphrase is easier to type on
 * a phone than an 8-character line of symbols.
 */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (v) => v.length >= MIN_PASSWORD_LENGTH,
  },
  { id: "upper", label: "One capital letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One small letter", test: (v) => /[a-z]/.test(v) },
  { id: "digit", label: "One number", test: (v) => /\d/.test(v) },
  {
    id: "symbol",
    label: "One symbol (!, @, #, …)",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

/*
 * Passwords that pass every rule above and are still worthless, because they
 * are the first thing any wordlist tries. "Password1!" satisfies all five.
 */
const BANNED = [
  "password",
  "passw0rd",
  "qwerty",
  "asdfgh",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "abc123",
  "111111",
  "123456",
  "12345678",
  "monkey",
  "dragon",
  "football",
  "finx",
  "paisa",
];

export interface PasswordVerdict {
  ok: boolean;
  failed: string[];
  /** The first thing to fix, phrased for a human. */
  message: string | null;
}

export function checkPassword(value: string, email?: string | null): PasswordVerdict {
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((r) => r.id);

  if (failed.length) {
    const first = PASSWORD_RULES.find((r) => r.id === failed[0])!;
    return { ok: false, failed, message: `Password needs: ${first.label.toLowerCase()}` };
  }

  if (value.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, failed: ["length"], message: "That password is too long" };
  }

  const lowered = value.toLowerCase();
  if (BANNED.some((word) => lowered.includes(word))) {
    return {
      ok: false,
      failed: ["common"],
      message: "That contains a very common password. Pick something else.",
    };
  }

  // Reusing the email as the password defeats the point of having one.
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lowered.includes(local)) {
    return {
      ok: false,
      failed: ["email"],
      message: "Do not use your email address in your password.",
    };
  }

  return { ok: true, failed: [], message: null };
}

/** 0-4, for the strength bar. Only ever shown once every rule already passes. */
export function passwordStrength(value: string): number {
  let score = 0;
  if (value.length >= MIN_PASSWORD_LENGTH) score++;
  if (value.length >= 14) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}
