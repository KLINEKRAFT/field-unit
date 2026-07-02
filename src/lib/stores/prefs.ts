"use client";

import { create } from "zustand";
import { prefsRepo } from "../db";
import { DEFAULT_PREFERENCES, type UserPreferences } from "../types";

interface PrefsStore {
  prefs: UserPreferences;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<UserPreferences>) => void;
}

export function applyThemeToDocument(prefs: UserPreferences): void {
  if (typeof document === "undefined") return;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = prefs.theme === "dark" || (prefs.theme === "system" && systemDark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.accent = prefs.accent;
  // Mirror to localStorage so the pre-paint script in layout.tsx can read it
  try {
    localStorage.setItem("fu-theme", prefs.theme);
    localStorage.setItem("fu-accent", prefs.accent);
  } catch {
    /* private mode */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#17150f" : "#d9d2c6");
}

export const usePrefs = create<PrefsStore>((set, get) => ({
  prefs: DEFAULT_PREFERENCES,
  hydrated: false,
  hydrate: async () => {
    const stored = await prefsRepo.get();
    const prefs = { ...DEFAULT_PREFERENCES, ...stored };
    // One-time migration to US units (the owner's spec); users can still
    // switch back in Settings afterwards.
    try {
      if (stored && !localStorage.getItem("fu-units-v2")) {
        prefs.tempUnit = "fahrenheit";
        prefs.windUnit = "mph";
        localStorage.setItem("fu-units-v2", "1");
        void prefsRepo.set(prefs);
      }
    } catch {
      /* private mode */
    }
    set({ prefs, hydrated: true });
    applyThemeToDocument(prefs);
  },
  update: (patch) => {
    const prefs = { ...get().prefs, ...patch };
    set({ prefs });
    applyThemeToDocument(prefs);
    void prefsRepo.set(prefs);
  },
}));
