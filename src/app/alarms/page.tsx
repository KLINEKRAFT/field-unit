"use client";

import { useState } from "react";
import { ToolScreen } from "@/components/ToolScreen";
import { TintablePage } from "@/components/TintablePage";
import { MechanicalButton, ToggleSwitch } from "@/components/controls";
import { DotMatrixDisplay } from "@/components/DotMatrixDisplay";
import { useAlarms, nextEnabledAlarm, nextFireTime } from "@/lib/stores/alarms";
import { usePrefs } from "@/lib/stores/prefs";
import { formatMinutesOfDay, pad2 } from "@/lib/format";
import { ALARM_SOUNDS, playAlarmCycle } from "@/lib/sound";
import type { Alarm, AlarmSoundId, Weekday } from "@/lib/types";
import { Plus, Trash2, Bell } from "lucide-react";

const WEEKDAYS: Array<{ day: Weekday; label: string; full: string }> = [
  { day: 1, label: "M", full: "Monday" },
  { day: 2, label: "T", full: "Tuesday" },
  { day: 3, label: "W", full: "Wednesday" },
  { day: 4, label: "T", full: "Thursday" },
  { day: 5, label: "F", full: "Friday" },
  { day: 6, label: "S", full: "Saturday" },
  { day: 0, label: "S", full: "Sunday" },
];

export default function AlarmsPage() {
  const alarms = useAlarms((s) => s.alarms);
  const [editing, setEditing] = useState<Alarm | "new" | null>(null);
  const next = nextEnabledAlarm(alarms);
  const timeFormat = usePrefs((s) => s.prefs.timeFormat);

  return (
    <TintablePage page="alarm">
    <ToolScreen
      title="Alarm"
      mode={next ? "ARMED" : "STANDBY"}
      lightOn={Boolean(next)}
      actions={
        <button
          type="button"
          aria-label="Add alarm"
          onClick={() => setEditing("new")}
          className="-mr-2 flex h-11 w-11 items-center justify-center text-ink"
        >
          <Plus size={22} strokeWidth={2.2} aria-hidden />
        </button>
      }
    >
      <div className="mx-auto flex max-w-md flex-col gap-6">
        {/* Next alarm on the dot matrix — same display as the clock */}
        <section className="flex flex-col items-center gap-3 py-6">
          <div className="w-full max-w-[300px] text-ink">
            <DotMatrixDisplay
              text={next ? formatMinutesOfDay(next.time, "24h") : "--:--"}
              dotSize={8}
              gap={3.5}
              showGrid
              fluid
              label={next ? `Next alarm ${formatMinutesOfDay(next.time, timeFormat)}` : "No alarm armed"}
            />
          </div>
          <p className="type-meta">
            {next
              ? `${next.name || "Alarm"} · in ${formatCountdown(nextFireTime(next) - Date.now())}`
              : "No alarm armed"}
          </p>
        </section>

        {/* Flat alarm rows */}
        <section>
          {alarms.length === 0 && !editing && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Bell size={18} aria-hidden className="text-ink-muted" />
              <MechanicalButton size="sm" onClick={() => setEditing("new")}>
                New alarm
              </MechanicalButton>
            </div>
          )}
          {alarms.map((a) => (
            <AlarmRow key={a.id} alarm={a} onEdit={() => setEditing(a)} />
          ))}
        </section>

        {editing && (
          <AlarmEditor alarm={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
        )}

        <NotificationHint />

        <p className="text-xs leading-relaxed text-ink-muted">
          Web apps on iOS cannot ring after being fully closed. Alarms fire while Field Unit is
          open; anything missed is flagged when you return.
        </p>
      </div>
    </ToolScreen>
    </TintablePage>
  );
}

function formatCountdown(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${min % 60}m`;
  return `${min}m`;
}

function AlarmRow({ alarm, onEdit }: { alarm: Alarm; onEdit: () => void }) {
  const update = useAlarms((s) => s.update);
  const timeFormat = usePrefs((s) => s.prefs.timeFormat);
  const repeatLabel =
    alarm.repeat.length === 0
      ? "Once"
      : alarm.repeat.length === 7
        ? "Every day"
        : WEEKDAYS.filter((w) => alarm.repeat.includes(w.day))
            .map((w) => w.label)
            .join(" ");

  return (
    <div className={`flex items-center justify-between py-3 hairline-b last:border-b-0 ${alarm.enabled ? "" : "opacity-50"}`}>
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 text-left"
        aria-label={`Edit alarm ${alarm.name || formatMinutesOfDay(alarm.time, timeFormat)}`}
      >
        <p className="type-display text-3xl">{formatMinutesOfDay(alarm.time, timeFormat)}</p>
        <p className="type-meta mt-0.5">
          {alarm.name ? `${alarm.name} · ` : ""}
          {repeatLabel}
        </p>
      </button>
      <ToggleSwitch
        checked={alarm.enabled}
        onChange={(v) => update(alarm.id, { enabled: v })}
        label={`Alarm ${formatMinutesOfDay(alarm.time, timeFormat)}`}
      />
    </div>
  );
}

function AlarmEditor({ alarm, onClose }: { alarm: Alarm | null; onClose: () => void }) {
  const { add, update, remove } = useAlarms();
  const [time, setTime] = useState(
    alarm ? `${pad2(Math.floor(alarm.time / 60))}:${pad2(alarm.time % 60)}` : "07:00",
  );
  const [name, setName] = useState(alarm?.name ?? "");
  const [repeat, setRepeat] = useState<Weekday[]>(alarm?.repeat ?? []);
  const [sound, setSound] = useState<AlarmSoundId>(alarm?.sound ?? "pulse");

  const save = () => {
    const [hh = "0", mm = "0"] = time.split(":");
    const minutes = Number(hh) * 60 + Number(mm);
    if (alarm) update(alarm.id, { time: minutes, name, repeat, sound, enabled: true });
    else add({ time: minutes, name, repeat, sound, enabled: true });
    onClose();
  };

  return (
    <section className="flex flex-col gap-4 border-t border-line pt-4" aria-label={alarm ? "Edit alarm" : "New alarm"}>
      <p className="type-label">{alarm ? "Edit alarm" : "New alarm"}</p>
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        aria-label="Alarm time"
        className="flat-input segments min-h-[56px] text-center text-3xl"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Alarm name (optional)"
        aria-label="Alarm name"
        className="flat-input text-sm"
      />
      <div>
        <p className="type-label mb-1">Repeat</p>
        <div className="flex justify-between" role="group" aria-label="Repeat on weekdays">
          {WEEKDAYS.map((w, i) => {
            const on = repeat.includes(w.day);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                aria-label={w.full}
                onClick={() => setRepeat(on ? repeat.filter((d) => d !== w.day) : [...repeat, w.day])}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  on ? "bg-ink text-surface" : "text-ink-muted"
                }`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="type-label mb-1">Sound</p>
        <div className="flex gap-6">
          {ALARM_SOUNDS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={sound === s.id}
              onClick={() => {
                setSound(s.id);
                playAlarmCycle(s.id);
              }}
              className={`min-h-[44px] text-sm font-bold uppercase tracking-[0.08em] ${
                sound === s.id ? "text-ink underline underline-offset-4" : "text-ink-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        {alarm && (
          <MechanicalButton
            variant="ghost"
            ariaLabel="Delete alarm"
            onClick={() => {
              remove(alarm.id);
              onClose();
            }}
          >
            <Trash2 size={16} aria-hidden style={{ color: "var(--alert)" }} />
          </MechanicalButton>
        )}
        <MechanicalButton variant="ghost" className="flex-1" onClick={onClose}>
          Cancel
        </MechanicalButton>
        <MechanicalButton variant="primary" className="flex-1" onClick={save}>
          Save
        </MechanicalButton>
      </div>
    </section>
  );
}

function NotificationHint() {
  const [status, setStatus] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  if (status !== "default") return null;
  return (
    <MechanicalButton
      variant="ghost"
      size="sm"
      onClick={() => {
        void Notification.requestPermission().then(setStatus);
      }}
    >
      <Bell size={14} aria-hidden /> Enable alarm notifications
    </MechanicalButton>
  );
}
