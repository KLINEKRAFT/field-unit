"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolScreen } from "@/components/ToolScreen";
import { MechanicalButton, MeasurementRow, ToggleSwitch } from "@/components/controls";
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
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Clock mode">
          {(["clock", "timer", "stopwatch"] as const).map((m) => (
            <MechanicalButton key={m} size="sm" active={mode === m} onClick={() => setMode(m)}>
              {m}
            </MechanicalButton>
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
  const [showAnalog, setShowAnalog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [zoneQuery, setZoneQuery] = useState("");

  const clock = formatClock(now, prefs.timeFormat, prefs.showSeconds);
  const allZones = useMemo(
    () => (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : []),
    [],
  );
  const matches = zoneQuery.length >= 2
    ? allZones.filter((z) => z.toLowerCase().includes(zoneQuery.toLowerCase())).slice(0, 6)
    : [];

  return (
    <>
      <section className="panel flex flex-col items-center gap-3 px-4 py-8">
        {showAnalog ? (
          <AnalogClock date={now} />
        ) : (
          <p className="type-measure segments text-[64px]" aria-live="off">
            {clock.time}
            {clock.suffix ? (
              <span className="ml-2 text-2xl text-ink-muted">{clock.suffix}</span>
            ) : null}
          </p>
        )}
        <p className="type-meta">{formatDateLong(now)}</p>
      </section>

      <section className="panel-inset px-4 py-1">
        <div className="flex items-center justify-between py-2.5 hairline-b">
          <span className="type-label">Analog dial</span>
          <ToggleSwitch checked={showAnalog} onChange={setShowAnalog} label="Analog dial" />
        </div>
        <div className="flex items-center justify-between py-2.5 hairline-b">
          <span className="type-label">Seconds</span>
          <ToggleSwitch
            checked={prefs.showSeconds}
            onChange={(v) => update({ showSeconds: v })}
            label="Show seconds"
          />
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="type-label">24-hour</span>
          <ToggleSwitch
            checked={prefs.timeFormat === "24h"}
            onChange={(v) => update({ timeFormat: v ? "24h" : "12h" })}
            label="24-hour time"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="type-label">World clocks</h2>
          <MechanicalButton
            size="sm"
            variant="ghost"
            onClick={() => setAdding(!adding)}
            ariaLabel="Add world clock"
          >
            <Plus size={16} aria-hidden /> Add
          </MechanicalButton>
        </div>
        {adding && (
          <div className="panel-inset flex flex-col gap-2 p-3">
            <input
              type="text"
              value={zoneQuery}
              onChange={(e) => setZoneQuery(e.target.value)}
              placeholder="Search time zone (e.g. Tokyo)"
              className="min-h-[44px] rounded-[12px] border border-line bg-surface px-3 text-sm outline-none"
              aria-label="Search time zone"
            />
            {matches.map((z) => (
              <button
                key={z}
                type="button"
                className="control min-h-[44px] px-3 text-left text-sm"
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
          <p className="text-sm text-ink-muted">No saved world clocks.</p>
        ) : (
          prefs.worldClocks.map((wc) => {
            const t = formatClock(now, prefs.timeFormat, false, wc.timeZone);
            return (
              <div key={wc.id} className="panel-inset flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold">{wc.label}</span>
                <span className="flex items-center gap-3">
                  <span className="type-measure segments text-xl">
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
                    <X size={16} aria-hidden />
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

function AnalogClock({ date }: { date: Date }) {
  const size = 220;
  const c = size / 2;
  const h = date.getHours() % 12;
  const m = date.getMinutes();
  const s = date.getSeconds();
  const hourAngle = (h + m / 60) * 30;
  const minAngle = (m + s / 60) * 6;
  const secAngle = s * 6;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Analog clock showing ${pad2(date.getHours())}:${pad2(m)}`}
    >
      <circle cx={c} cy={c} r={c - 2} fill="var(--surface)" stroke="var(--line-strong)" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i * Math.PI * 2) / 60 - Math.PI / 2;
        const major = i % 5 === 0;
        const r1 = c - (major ? 16 : 10);
        const r2 = c - 6;
        return (
          <line
            key={i}
            x1={c + Math.cos(a) * r1}
            y1={c + Math.sin(a) * r1}
            x2={c + Math.cos(a) * r2}
            y2={c + Math.sin(a) * r2}
            stroke="var(--ink)"
            strokeWidth={major ? 2 : 1}
            opacity={major ? 0.9 : 0.35}
          />
        );
      })}
      <g transform={`rotate(${hourAngle} ${c} ${c})`}>
        <rect x={c - 3} y={c - 52} width={6} height={58} rx={3} fill="var(--ink)" />
      </g>
      <g transform={`rotate(${minAngle} ${c} ${c})`}>
        <rect x={c - 2} y={c - 78} width={4} height={86} rx={2} fill="var(--ink)" />
      </g>
      <g transform={`rotate(${secAngle} ${c} ${c})`}>
        <rect x={c - 1} y={c - 86} width={2} height={100} rx={1} fill="var(--accent)" />
      </g>
      <circle cx={c} cy={c} r={5} fill="var(--ink)" />
      <circle cx={c} cy={c} r={2} fill="var(--accent)" />
    </svg>
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

  // fire completion exactly once when the deadline passes
  useEffect(() => {
    if (timer.status === "running" && timer.endAt !== null && timer.endAt <= Date.now()) {
      timer.complete();
    }
  }, [now, timer]);

  const progress = timer.totalMs > 0 ? 1 - remaining / timer.totalMs : 0;
  const configuredMs = (h * 3600 + m * 60 + s) * 1000;

  return (
    <>
      <section className="panel flex flex-col items-center gap-5 px-4 py-8">
        <TimerRing progress={timer.status === "idle" ? 0 : progress} done={timer.status === "done"}>
          <p className="type-measure segments text-4xl" role="timer" aria-live="off">
            {timer.status === "idle" ? formatDuration(configuredMs) : formatDuration(remaining)}
          </p>
        </TimerRing>

        {timer.status === "idle" && (
          <div className="flex items-center gap-2" aria-label="Set timer duration">
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
        <section className="grid grid-cols-3 gap-2">
          {TIMER_PRESETS.map((p) => (
            <MechanicalButton key={p.label} size="sm" onClick={() => timer.start(p.ms)}>
              {p.label}
            </MechanicalButton>
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
        className="segments h-14 w-16 rounded-[12px] border border-line bg-surface text-center text-2xl outline-none"
        aria-label={label}
      />
      <span className="type-label text-[9px]">{label}</span>
    </label>
  );
}

function TimerRing({
  progress,
  done,
  children,
}: {
  progress: number;
  done: boolean;
  children: React.ReactNode;
}) {
  const size = 220;
  const r = 100;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? "var(--alert)" : "var(--accent)"}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 250ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ------------------------------- stopwatch ------------------------------ */

function StopwatchMode() {
  const sw = useStopwatch();
  const [, force] = useState(0);

  // 30fps re-render only while running
  useEffect(() => {
    if (!sw.running) return;
    const id = setInterval(() => force((n) => n + 1), 33);
    return () => clearInterval(id);
  }, [sw.running]);

  const elapsed = stopwatchElapsed(sw);

  return (
    <>
      <section className="panel flex flex-col items-center gap-6 px-4 py-10">
        <p className="type-measure segments text-6xl" role="timer" aria-live="off">
          {formatDuration(elapsed, true)}
        </p>
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
        <section className="panel-inset px-4 py-1">
          {sw.laps.map((lapTime, i) => {
            const prev = sw.laps[i + 1] ?? 0;
            return (
              <MeasurementRow
                key={`${lapTime}-${i}`}
                label={`Lap ${sw.laps.length - i}`}
                value={formatDuration(lapTime - prev, true)}
                sub={formatDuration(lapTime, true)}
              />
            );
          })}
        </section>
      )}
    </>
  );
}
