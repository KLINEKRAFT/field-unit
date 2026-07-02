"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolScreen } from "@/components/ToolScreen";
import { MechanicalButton, ToggleSwitch } from "@/components/controls";
import { DotMatrixDisplay } from "@/components/DotMatrixDisplay";
import { useNow } from "@/lib/hooks/useNow";
import { usePrefs } from "@/lib/stores/prefs";
import { useTimer } from "@/lib/stores/timer";
import { useStopwatch, stopwatchElapsed } from "@/lib/stores/stopwatch";
import { formatClock, formatDateLong, formatDuration, pad2 } from "@/lib/format";
import { uid } from "@/lib/db";
import { Plus, X } from "lucide-react";

type Mode = "clock" | "timer" | "stopwatch";

export default function ClockPage() {
  const [mode, setMode] = useState<Mode>("clock");
  const timerStatus = useTimer((s) => s.status);

  return (
    <ToolScreen
      title={mode === "clock" ? "Clock" : mode === "timer" ? "Timer" : "Stopwatch"}
      mode={mode.toUpperCase()}
      lightOn={mode !== "clock" || timerStatus === "running"}
    >
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex gap-6 hairline-b" role="tablist" aria-label="Clock mode">
          {(["clock", "timer", "stopwatch"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className="text-tab"
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "clock" && <ClockMode />}
        {mode === "timer" && <TimerMode />}
        {mode === "stopwatch" && <StopwatchMode />}
      </div>
    </ToolScreen>
  );
}

/* --------------------------------- clock -------------------------------- */

function ClockMode() {
  const now = useNow(500);
  const prefs = usePrefs((s) => s.prefs);
  const update = usePrefs((s) => s.update);
  const [adding, setAdding] = useState(false);
  const [zoneQuery, setZoneQuery] = useState("");

  const clock = formatClock(now, prefs.timeFormat, false);
  const seconds = pad2(now.getSeconds());
  const allZones = useMemo(
    () => (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : []),
    [],
  );
  const matches =
    zoneQuery.length >= 2
      ? allZones.filter((z) => z.toLowerCase().includes(zoneQuery.toLowerCase())).slice(0, 6)
      : [];

  return (
    <>
      {/* The clock IS the dot matrix */}
      <section className="flex flex-col items-center gap-4 py-8">
        <div className="w-full max-w-[330px] text-ink">
          <DotMatrixDisplay
            text={clock.time}
            dotSize={8}
            gap={3.5}
            showGrid
            fluid
            label={`Current time ${clock.time}${clock.suffix}`}
          />
        </div>
        <p className="type-meta">
          {clock.suffix ? `${clock.suffix} · ` : ""}
          {prefs.showSeconds ? `${seconds} SEC · ` : ""}
          {formatDateLong(now)}
        </p>
      </section>

      {/* Flat settings rows */}
      <section>
        <div className="flex items-center justify-between py-3 hairline-b">
          <span className="type-label">Seconds</span>
          <ToggleSwitch
            checked={prefs.showSeconds}
            onChange={(v) => update({ showSeconds: v })}
            label="Show seconds"
          />
        </div>
        <div className="flex items-center justify-between py-3 hairline-b">
          <span className="type-label">24-hour</span>
          <ToggleSwitch
            checked={prefs.timeFormat === "24h"}
            onChange={(v) => update({ timeFormat: v ? "24h" : "12h" })}
            label="24-hour time"
          />
        </div>
      </section>

      {/* World clocks — flat rows */}
      <section>
        <div className="flex items-center justify-between py-2">
          <h2 className="type-label">World clocks</h2>
          <button
            type="button"
            aria-label="Add world clock"
            onClick={() => setAdding(!adding)}
            className="-mr-2 flex h-11 w-11 items-center justify-center text-ink"
          >
            <Plus size={18} aria-hidden />
          </button>
        </div>
        {adding && (
          <div className="flex flex-col gap-1 pb-3">
            <input
              type="text"
              value={zoneQuery}
              onChange={(e) => setZoneQuery(e.target.value)}
              placeholder="Search time zone (e.g. Tokyo)"
              aria-label="Search time zone"
              className="flat-input text-sm"
              autoFocus
            />
            {matches.map((z) => (
              <button
                key={z}
                type="button"
                className="min-h-[44px] text-left text-sm hairline-b"
                onClick={() => {
                  update({
                    worldClocks: [
                      ...prefs.worldClocks,
                      { id: uid(), label: z.split("/").pop()?.replace(/_/g, " ") ?? z, timeZone: z },
                    ],
                  });
                  setAdding(false);
                  setZoneQuery("");
                }}
              >
                {z.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
        {prefs.worldClocks.length === 0 && !adding ? (
          <p className="py-1 text-sm text-ink-muted">None saved.</p>
        ) : (
          prefs.worldClocks.map((wc) => {
            const t = formatClock(now, prefs.timeFormat, false, wc.timeZone);
            return (
              <div key={wc.id} className="flex items-center justify-between py-2 hairline-b last:border-b-0">
                <span className="text-sm font-bold">{wc.label}</span>
                <span className="flex items-center gap-2">
                  <span className="type-measure segments text-lg">
                    {t.time}
                    {t.suffix ? <span className="ml-1 text-xs text-ink-muted">{t.suffix}</span> : null}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${wc.label}`}
                    className="flex h-11 w-11 items-center justify-center text-ink-muted"
                    onClick={() =>
                      update({ worldClocks: prefs.worldClocks.filter((w) => w.id !== wc.id) })
                    }
                  >
                    <X size={15} aria-hidden />
                  </button>
                </span>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}

/* --------------------------------- timer -------------------------------- */

const TIMER_PRESETS = [
  { label: "1 min", ms: 60_000 },
  { label: "3 min", ms: 180_000 },
  { label: "5 min", ms: 300_000 },
  { label: "10 min", ms: 600_000 },
  { label: "15 min", ms: 900_000 },
  { label: "30 min", ms: 1_800_000 },
];

function TimerMode() {
  const timer = useTimer();
  const [h, setH] = useState(0);
  const [m, setM] = useState(5);
  const [s, setS] = useState(0);
  const now = useNow(timer.status === "running" ? 250 : 60_000);

  const remaining =
    timer.status === "running" && timer.endAt !== null
      ? Math.max(0, timer.endAt - now.getTime())
      : timer.remainingMs;

  useEffect(() => {
    if (timer.status === "running" && timer.endAt !== null && timer.endAt <= Date.now()) {
      timer.complete();
    }
  }, [now, timer]);

  const progress = timer.totalMs > 0 ? 1 - remaining / timer.totalMs : 0;
  const configuredMs = (h * 3600 + m * 60 + s) * 1000;
  const displayMs = timer.status === "idle" ? configuredMs : remaining;

  return (
    <>
      <section className="flex flex-col items-center gap-6 py-6">
        <div className="w-full max-w-[330px] text-ink" role="timer">
          <DotMatrixDisplay
            text={formatDuration(displayMs)}
            dotSize={8}
            gap={3.5}
            showGrid
            fluid
            label={`Timer ${formatDuration(displayMs)}`}
          />
        </div>

        {/* thin linear progress — flat, no ring */}
        <div className="h-[3px] w-full max-w-[330px] overflow-hidden rounded-full" style={{ background: "var(--line)" }} aria-hidden>
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-linear"
            style={{
              width: `${timer.status === "idle" ? 0 : progress * 100}%`,
              background: timer.status === "done" ? "var(--alert)" : "var(--accent)",
            }}
          />
        </div>

        {timer.status === "idle" && (
          <div className="flex items-center gap-3" aria-label="Set timer duration">
            <DurationField label="Hours" value={h} max={23} onChange={setH} />
            <span className="type-measure text-2xl text-ink-muted">:</span>
            <DurationField label="Minutes" value={m} max={59} onChange={setM} />
            <span className="type-measure text-2xl text-ink-muted">:</span>
            <DurationField label="Seconds" value={s} max={59} onChange={setS} />
          </div>
        )}

        <div className="flex w-full max-w-xs flex-col gap-2">
          {timer.status === "idle" && (
            <MechanicalButton
              variant="primary"
              size="lg"
              disabled={configuredMs === 0}
              onClick={() => timer.start(configuredMs)}
            >
              Start
            </MechanicalButton>
          )}
          {timer.status === "running" && (
            <MechanicalButton size="lg" onClick={timer.pause}>
              Pause
            </MechanicalButton>
          )}
          {timer.status === "paused" && (
            <MechanicalButton variant="primary" size="lg" onClick={timer.resume}>
              Resume
            </MechanicalButton>
          )}
          {timer.status === "done" && (
            <p className="text-center type-label" style={{ color: "var(--alert)" }}>
              Time elapsed
            </p>
          )}
          {timer.status !== "idle" && (
            <MechanicalButton variant="ghost" onClick={timer.reset}>
              Reset
            </MechanicalButton>
          )}
        </div>
      </section>

      {timer.status === "idle" && (
        <section className="flex flex-wrap justify-center gap-x-7 gap-y-1">
          {TIMER_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => timer.start(p.ms)}
              className="min-h-[44px] text-sm font-bold uppercase tracking-[0.08em] text-ink-muted"
            >
              {p.label}
            </button>
          ))}
        </section>
      )}
    </>
  );
}

function DurationField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={pad2(value)}
        onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
        className="flat-input segments h-14 w-16 text-center text-2xl"
        aria-label={label}
      />
      <span className="type-label text-[9px]">{label}</span>
    </label>
  );
}

/* ------------------------------- stopwatch ------------------------------ */

function StopwatchMode() {
  const sw = useStopwatch();
  const [, force] = useState(0);

  useEffect(() => {
    if (!sw.running) return;
    const id = setInterval(() => force((n) => n + 1), 50);
    return () => clearInterval(id);
  }, [sw.running]);

  const elapsed = stopwatchElapsed(sw);

  return (
    <>
      <section className="flex flex-col items-center gap-8 py-8">
        <div className="w-full max-w-[350px] text-ink" role="timer">
          <DotMatrixDisplay
            text={formatDuration(elapsed, true)}
            dotSize={7}
            gap={3}
            showGrid
            fluid
            label={`Stopwatch ${formatDuration(elapsed, true)}`}
          />
        </div>
        <div className="flex w-full max-w-xs gap-2">
          {!sw.running && elapsed === 0 && (
            <MechanicalButton variant="primary" size="lg" className="flex-1" onClick={sw.start}>
              Start
            </MechanicalButton>
          )}
          {sw.running && (
            <>
              <MechanicalButton size="lg" className="flex-1" onClick={() => sw.lap(elapsed)}>
                Lap
              </MechanicalButton>
              <MechanicalButton variant="primary" size="lg" className="flex-1" onClick={sw.pause}>
                Pause
              </MechanicalButton>
            </>
          )}
          {!sw.running && elapsed > 0 && (
            <>
              <MechanicalButton variant="ghost" size="lg" className="flex-1" onClick={sw.reset}>
                Reset
              </MechanicalButton>
              <MechanicalButton variant="primary" size="lg" className="flex-1" onClick={sw.start}>
                Resume
              </MechanicalButton>
            </>
          )}
        </div>
      </section>

      {sw.laps.length > 0 && (
        <section>
          {sw.laps.map((lapTime, i) => {
            const prev = sw.laps[i + 1] ?? 0;
            return (
              <div key={`${lapTime}-${i}`} className="flex items-baseline justify-between py-2.5 hairline-b last:border-b-0">
                <span className="type-label">Lap {sw.laps.length - i}</span>
                <span className="type-measure text-base">
                  {formatDuration(lapTime - prev, true)}
                  <span className="ml-2 text-xs text-ink-muted">{formatDuration(lapTime, true)}</span>
                </span>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
