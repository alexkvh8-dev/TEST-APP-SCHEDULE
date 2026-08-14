import type { NeedLevel } from "../types";

export interface Classification {
  category: string;
  need_level: NeedLevel;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type ProviderName = "gemini" | "anthropic" | "rules";
