"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefs } from "@/lib/stores/prefs";
import { MechanicalButton, ToggleSwitch } from "@/components/controls";
import { exportAllData, importAllData, deleteAllData, type ExportBundle } from "@/lib/db";
import { downloadFile } from "@/lib/ics";
import { getAIStatus } from "@/lib/ai/client";
import type { AccentId, PermissionKind, PermissionStatus, TempUnit, ThemeMode, WindUnit } from "@/lib/types";

const APP_VERSION = "0.1.0";

/* Signal colors from the Field Unit design-kit palette */
const ACCENTS: Array<{ id: AccentId; label: string; hex: string }> = [
  { id: "orange", label: "Signal orange", hex: "#ed8008" },
  { id: "flame", label: "Flame", hex: "#ed3f1c" },
  { id: "olive", label: "Olive", hex: "#736b1e" },
  { id: "oxide", label: "Oxide red", hex: "#bf1b1b" },
];

export default function SettingsPage() {
  const prefs = usePrefs((s) => s.prefs);
  const update = usePrefs((s) => s.update);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-8">
      <header className="pb-1 pt-3">
        <h1 className="type-title text-3xl">Settings</h1>
      </header>

      <Section title="Appearance">
        <Row label="Theme">
          <div className="flex gap-1.5">
            {(["light", "dark", "system"] as ThemeMode[]).map((t) => (
              <MechanicalButton key={t} size="sm" active={prefs.theme === t} onClick={() => update({ theme: t })}>
                {t}
              </MechanicalButton>
            ))}
          </div>
        </Row>
        <Row label="Signal color">
          <div className="flex gap-2" role="group" aria-label="Accent color">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                aria-pressed={prefs.accent === a.id}
                onClick={() => update({ accent: a.id })}
                className="h-9 w-9 rounded-full border-2 transition-transform active:scale-95"
                style={{
                  background: a.hex,
                  borderColor: prefs.accent === a.id ? "var(--ink)" : "var(--line)",
                }}
              />
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Units">
        <Row label="Time format">
          <div className="flex gap-1.5">
            {(["12h", "24h"] as const).map((t) => (
              <MechanicalButton key={t} size="sm" active={prefs.timeFormat === t} onClick={() => update({ timeFormat: t })}>
                {t}
              </MechanicalButton>
            ))}
          </div>
        </Row>
        <Row label="Temperature">
          <div className="flex gap-1.5">
            {([
              { id: "celsius", label: "°C" },
              { id: "fahrenheit", label: "°F" },
            ] as Array<{ id: TempUnit; label: string }>).map((t) => (
              <MechanicalButton key={t.id} size="sm" active={prefs.tempUnit === t.id} onClick={() => update({ tempUnit: t.id })}>
                {t.label}
              </MechanicalButton>
            ))}
          </div>
        </Row>
        <Row label="Wind speed">
          <div className="flex gap-1.5">
            {([
              { id: "kmh", label: "km/h" },
              { id: "mph", label: "mph" },
              { id: "ms", label: "m/s" },
            ] as Array<{ id: WindUnit; label: string }>).map((t) => (
              <MechanicalButton key={t.id} size="sm" active={prefs.windUnit === t.id} onClick={() => update({ windUnit: t.id })}>
                {t.label}
              </MechanicalButton>
            ))}
          </div>
        </Row>
      </Section>

      <PermissionsSection />

      <AISection enabled={prefs.aiEnabled} onToggle={(v) => update({ aiEnabled: v })} />

      <DataSection />

      <Section title="About">
        <p className="px-1 text-sm leading-relaxed text-ink-muted">
          Field Unit v{APP_VERSION}. A personal multi-instrument web app. All personal data —
          notes, events, alarms, recordings, stations — is stored locally on this device
          (IndexedDB) and never uploaded automatically. No accounts, no analytics, no ads.
        </p>
        <p className="px-1 pt-2 text-sm leading-relaxed text-ink-muted">
          Platform limitations: as an iOS web app, alarms and timers only ring while the app is
          open; background recording stops when iOS suspends the app; radio playback may pause in
          the background. Install to Home Screen for the best experience.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="type-label">{title}</h2>
      <div className="panel flex flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </div>
  );
}

/* ------------------------------ permissions ----------------------------- */

const PERMISSION_LABELS: Record<PermissionKind, string> = {
  geolocation: "Location",
  motion: "Motion & orientation",
  microphone: "Microphone",
  notifications: "Notifications",
};

function PermissionsSection() {
  const [state, setState] = useState<Record<PermissionKind, PermissionStatus>>({
    geolocation: "unknown",
    motion: "unknown",
    microphone: "unknown",
    notifications: "unknown",
  });

  useEffect(() => {
    void (async () => {
      const next = { ...state };
      if (navigator.permissions) {
        for (const [kind, name] of [
          ["geolocation", "geolocation"],
          ["microphone", "microphone"],
          ["notifications", "notifications"],
        ] as Array<[PermissionKind, PermissionName]>) {
          try {
            const s = await navigator.permissions.query({ name });
            next[kind] = s.state as PermissionStatus;
          } catch {
            next[kind] = "unknown";
          }
        }
      }
      // iOS motion permission is only knowable by asking; report capability instead
      next.motion =
        typeof window !== "undefined" && "DeviceOrientationEvent" in window ? "prompt" : "unsupported";
      setState(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusText: Record<PermissionStatus, string> = {
    granted: "Granted",
    denied: "Denied",
    prompt: "Asks when needed",
    unknown: "Unknown",
    unsupported: "Not available",
  };

  return (
    <Section title="Permissions">
      {(Object.keys(PERMISSION_LABELS) as PermissionKind[]).map((k) => (
        <Row key={k} label={PERMISSION_LABELS[k]}>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{
                background:
                  state[k] === "granted"
                    ? "var(--sage)"
                    : state[k] === "denied"
                      ? "var(--alert)"
                      : "var(--ink-faint)",
              }}
            />
            <span className="type-meta">{statusText[state[k]]}</span>
          </span>
        </Row>
      ))}
      <p className="type-meta px-1">
        Permissions are only requested when you use the matching instrument.
      </p>
    </Section>
  );
}

/* ---------------------------------- AI ---------------------------------- */

function AISection({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  const [status, setStatus] = useState<{ configured: boolean; provider: string | null } | null>(null);

  useEffect(() => {
    if (enabled) void getAIStatus().then(setStatus);
  }, [enabled]);

  return (
    <Section title="AI assistance">
      <Row label="AI actions">
        <ToggleSwitch checked={enabled} onChange={onToggle} label="Enable AI actions" />
      </Row>
      {enabled && (
        <Row label="Provider">
          <span className="type-meta">
            {status === null
              ? "Checking…"
              : status.configured
                ? `Ready (${status.provider})`
                : "Not configured on server"}
          </span>
        </Row>
      )}
      <p className="type-meta px-1">
        Off by default. Notes and recordings are only sent to the AI provider when you explicitly
        tap an AI action — never automatically.
      </p>
    </Section>
  );
}

/* --------------------------------- data --------------------------------- */

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const doExport = async () => {
    const bundle = await exportAllData();
    downloadFile(
      `field-unit-export-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(bundle, null, 2),
      "application/json",
    );
    setMessage("Export downloaded. Recordings' audio stays on-device (metadata only).");
  };

  const doImport = async (file: File) => {
    try {
      const bundle = JSON.parse(await file.text()) as ExportBundle;
      await importAllData(bundle);
      setMessage("Import complete. Reload to see everything.");
    } catch (e) {
      setMessage(`Import failed: ${(e as Error).message}`);
    }
  };

  const doWipe = async () => {
    await deleteAllData();
    setConfirmWipe(false);
    setMessage("All local data deleted. Reload the app.");
  };

  return (
    <Section title="Your data">
      <div className="flex gap-2">
        <MechanicalButton size="sm" className="flex-1" onClick={() => void doExport()}>
          Export data
        </MechanicalButton>
        <MechanicalButton size="sm" className="flex-1" onClick={() => fileRef.current?.click()}>
          Import data
        </MechanicalButton>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void doImport(f);
          e.target.value = "";
        }}
      />
      {confirmWipe ? (
        <div className="flex flex-col gap-2" role="alertdialog" aria-label="Confirm delete all data">
          <p className="text-sm" style={{ color: "var(--alert)" }}>
            This permanently deletes every note, event, alarm, recording and setting on this
            device. There is no undo.
          </p>
          <div className="flex gap-2">
            <MechanicalButton size="sm" variant="ghost" className="flex-1" onClick={() => setConfirmWipe(false)}>
              Cancel
            </MechanicalButton>
            <MechanicalButton size="sm" variant="danger" className="flex-1" onClick={() => void doWipe()}>
              Delete everything
            </MechanicalButton>
          </div>
        </div>
      ) : (
        <MechanicalButton size="sm" variant="ghost" onClick={() => setConfirmWipe(true)}>
          <span style={{ color: "var(--alert)" }}>Delete all local data</span>
        </MechanicalButton>
      )}
      {message && (
        <p className="type-meta" role="status">
          {message}
        </p>
      )}
      <p className="type-meta px-1">Local-only: everything lives in this browser&apos;s storage.</p>
    </Section>
  );
}
