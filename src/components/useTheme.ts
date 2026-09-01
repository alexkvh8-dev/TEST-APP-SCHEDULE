"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const KEY = "paisa-theme";

function read(): ThemeChoice {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Private mode, or storage blocked. System it is.
  }
  return "system";
}

/**
 * Theme is a per-device choice, so it lives in localStorage rather than the
 * profile — the same account on a phone and a laptop can want different things.
 * "system" removes the attribute entirely and lets the media query decide.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>("system");

  // Read after mount: the inline script in the layout has already applied the
  // attribute, so there is nothing to flash here.
  useEffect(() => setTheme(read()), []);

  const choose = useCallback((next: ThemeChoice) => {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // The attribute is already set; only persistence failed.
    }
  }, []);

  return { theme, choose };
}
