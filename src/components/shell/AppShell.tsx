"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePrefs, applyThemeToDocument } from "@/lib/stores/prefs";
import { useAlarms } from "@/lib/stores/alarms";
import { useNotes } from "@/lib/stores/notes";
import { useEvents } from "@/lib/stores/events";
import { useRadio } from "@/lib/stores/radio";
import { useRecordings } from "@/lib/stores/recordings";
import { useWeather } from "@/lib/stores/weather";
import { useTimer } from "@/lib/stores/timer";
import { AlarmEngine } from "./AlarmEngine";
import { OfflineIndicator } from "./OfflineIndicator";

/** Hydrates all local stores once and hosts global chrome. */
export function AppShell({ children }: { children: ReactNode }) {
  const prefs = usePrefs((s) => s.prefs);
  const [updateReady, setUpdateReady] = useState(false);
  // Live clocks and store data only exist client-side; rendering them into the
  // prerendered HTML would guarantee hydration mismatches. Mount-gate instead.
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    setBooted(true);
    void usePrefs.getState().hydrate();
    void useAlarms.getState().hydrate();
    void useNotes.getState().hydrate();
    void useEvents.getState().hydrate();
    void useRadio.getState().hydrate();
    void useRecordings.getState().hydrate();
    void useWeather.getState().hydrate();
    void useTimer.getState().hydrate();
  }, []);

  // Track system appearance while in "system" mode
  useEffect(() => {
    if (prefs.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeToDocument(usePrefs.getState().prefs);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [prefs.theme]);

  // Register the service worker for offline support
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {
        /* offline support is progressive enhancement */
      });
  }, []);

  return (
    <div className="app-frame">
      <main id="main" className="app-main">
        {booted ? (
          children
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />
            <span className="type-label">Field Unit</span>
          </div>
        )}
      </main>
      <AlarmEngine />
      <OfflineIndicator />
      {updateReady && (
        <div
          role="status"
          className="fixed left-1/2 z-30 -translate-x-1/2"
          style={{ bottom: "calc(var(--sab) + 20px)" }}
        >
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="panel flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em]"
          >
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
            Update ready — tap to reload
          </button>
        </div>
      )}
    </div>
  );
}
