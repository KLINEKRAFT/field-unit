"use client";

/**
 * Per-page background changer: a vertical strip of the five kit palette
 * squares. Tapping a square tints the whole page; tapping the active square
 * again returns to the theme default. Ink flips light/dark per swatch for
 * contrast. Notes deliberately does not use this.
 */
import type { CSSProperties, ReactNode } from "react";
import { usePrefs } from "@/lib/stores/prefs";
import { playTick } from "@/lib/sound";
import type { TintId, TintablePageId } from "@/lib/types";

const DARK_INK = {
  "--ink": "#080808",
  "--ink-muted": "rgba(8, 8, 8, 0.55)",
  "--ink-faint": "rgba(8, 8, 8, 0.3)",
  "--line": "rgba(8, 8, 8, 0.18)",
  "--line-strong": "rgba(8, 8, 8, 0.42)",
  "--accent": "#080808",
  "--inset-hi": "rgba(255, 255, 255, 0.25)",
  "--inset-lo": "rgba(8, 8, 8, 0.08)",
  color: "#080808",
} as CSSProperties;

const LIGHT_INK = {
  "--ink": "#f5f1e9",
  "--ink-muted": "rgba(245, 241, 233, 0.62)",
  "--ink-faint": "rgba(245, 241, 233, 0.32)",
  "--line": "rgba(245, 241, 233, 0.22)",
  "--line-strong": "rgba(245, 241, 233, 0.48)",
  "--accent": "#f5f1e9",
  "--inset-hi": "rgba(255, 255, 255, 0.08)",
  "--inset-lo": "rgba(0, 0, 0, 0.2)",
  color: "#f5f1e9",
} as CSSProperties;

export const TINTS: Array<{ id: TintId; hex: string; label: string; vars: CSSProperties }> = [
  {
    id: "orange",
    hex: "#ed8008",
    label: "Signal orange",
    vars: {
      background: "#ed8008",
      "--surface": "#ed8008",
      "--panel": "#ef8d1f",
      "--panel-2": "#f19a36",
      "--accent-ink": "#ed8008",
      ...DARK_INK,
    } as CSSProperties,
  },
  {
    id: "flame",
    hex: "#ed3f1c",
    label: "Flame",
    vars: {
      background: "#ed3f1c",
      "--surface": "#ed3f1c",
      "--panel": "#ef4f2e",
      "--panel-2": "#f15f40",
      "--accent-ink": "#ed3f1c",
      ...DARK_INK,
    } as CSSProperties,
  },
  {
    id: "oxide",
    hex: "#bf1b1b",
    label: "Oxide red",
    vars: {
      background: "#bf1b1b",
      "--surface": "#bf1b1b",
      "--panel": "#c62f2f",
      "--panel-2": "#cd4343",
      "--accent-ink": "#bf1b1b",
      ...LIGHT_INK,
    } as CSSProperties,
  },
  {
    id: "olive",
    hex: "#736b1e",
    label: "Olive",
    vars: {
      background: "#736b1e",
      "--surface": "#736b1e",
      "--panel": "#7d752e",
      "--panel-2": "#877f3e",
      "--accent-ink": "#736b1e",
      ...LIGHT_INK,
    } as CSSProperties,
  },
  {
    id: "greige",
    hex: "#d9d2c6",
    label: "Greige",
    vars: {
      background: "#d9d2c6",
      "--surface": "#d9d2c6",
      "--panel": "#deddd9",
      "--panel-2": "#d5d4d1",
      "--accent-ink": "#d9d2c6",
      ...DARK_INK,
    } as CSSProperties,
  },
];

/** Fills the PWA safe areas so the tint runs edge to edge. */
const BLEED: CSSProperties = {
  marginTop: "calc(-1 * (var(--sat) + 10px))",
  paddingTop: "calc(var(--sat) + 10px)",
  marginBottom: "calc(-1 * (var(--sab) + 28px))",
  paddingBottom: "calc(var(--sab) + 28px)",
  // cover the full viewport even when the page content is short
  minHeight: "calc(100% + var(--sat) + var(--sab) + 38px)",
};

interface TintablePageProps {
  page: TintablePageId;
  /** vars applied when no tint is chosen (e.g. the recorder's dark deck) */
  defaultVars?: CSSProperties;
  children: ReactNode;
}

export function TintablePage({ page, defaultVars, children }: TintablePageProps) {
  const tintId = usePrefs((s) => s.prefs.pageTints[page]);
  const tint = TINTS.find((t) => t.id === tintId);

  return (
    <div className="relative min-h-full" style={{ ...BLEED, ...(tint?.vars ?? defaultVars) }}>
      {/* clearance for the swatch strip on the right edge */}
      <div style={{ paddingRight: 18 }}>{children}</div>
      <TintStrip page={page} active={tintId} />
    </div>
  );
}

function TintStrip({ page, active }: { page: TintablePageId; active: TintId | undefined }) {
  const update = usePrefs((s) => s.update);
  const pageTints = usePrefs((s) => s.prefs.pageTints);

  const select = (id: TintId) => {
    playTick();
    const next = { ...pageTints };
    if (active === id) delete next[page];
    else next[page] = id;
    update({ pageTints: next });
  };

  return (
    <div
      className="fixed right-0 top-1/2 z-30 flex w-[26px] -translate-y-1/2 flex-col items-center"
      role="group"
      aria-label="Page background color"
    >
      {TINTS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-label={`Background: ${t.label}`}
          aria-pressed={active === t.id}
          onClick={() => select(t.id)}
          className="flex h-8 w-full items-center justify-center"
        >
          <span
            aria-hidden
            className="block rounded-[3px] transition-all duration-150"
            style={{
              width: active === t.id ? 16 : 11,
              height: active === t.id ? 16 : 11,
              background: t.hex,
              boxShadow: active === t.id ? "0 0 0 1.5px var(--ink)" : "0 0 0 1px rgba(8,8,8,0.25)",
            }}
          />
        </button>
      ))}
    </div>
  );
}
