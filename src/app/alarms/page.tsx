"use client";

import { useState } from "react";
import { ToolScreen } from "@/components/ToolScreen";
import { MechanicalButton, ToggleSwitch } from "@/components/controls";
import { EmptyState } from "@/components/states";
import { useAlarms, nextEnabledAlarm, nextFireTime } from "@/lib/stores/alarms";
import { usePrefs } from "@/lib/stores/prefs";
import { formatMinutesOfDay, pad2 } from "@/lib/format";
import { ALARM_SOUNDS, playAlarmCycle } from "@/lib/sound";
import type { Alarm, AlarmSoundId, Weekday } from "@/lib/types";
import { Plus, Trash2, Bell } from "lucide-react";

const WEEKDAYS: Array<{ day: Weekday; label: string }> = [
  { day: 1, label: "M" },
  { day: 2, label: "T" },
  { day: 3, label: "W" },
  { day: 4, label: "T" },
  { day: 5, label: "F" },
  { day: 6, label: "S" },
  { day: 0, label: "S" },
];

export default function AlarmsPage() {
  const alarms = useAlarms((s) => s.alarms);
  const [editing, setEditing] = useState<Alarm | "new" | null>(null);
  const next = nextEnabledAlarm(alarms);
  const timeFormat = usePrefs((s) => s.prefs.timeFormat);

  return (
    <ToolScreen
      title="Alarms"
      mode={next ? "ARMED" : "STANDBY"}
      lightOn={Boolean(next)}
      actions={
        <button
          type="button"
          aria-label="Add alarm"
          onClick={() => setEditing("new")}
          className="control flex h-11 w-11 items-center justify-center"
        >
          <Plus size={18} aria-hidden />
        </button>
      }
    >
      <div className="mx-auto flex max-w-md flex-col gap-5">
        {next && (
          <section className="panel flex items-center justify-between px-5 py-4">
            <div>
              <p className="type-label">Next alarm</p>
              <p className="type-measure segments mt-1 text-4xl">
                {formatMinutesOfDay(next.time, timeFormat)}
              </p>
            </div>
            <p className="type-meta text-right">
              {next.name || "Alarm"}
              <br />
              in {formatCountdown(nextFireTime(next) - Date.now())}
            </p>
          </section>
        )}

        {alarms.length === 0 && !editing && (
          <EmptyState
            title="No alarms"
            message="Set a one-time or repeating alarm. It rings while Field Unit is open."
            action={{ label: "New alarm", onClick: () => setEditing("new") }}
            icon={<Bell size={20} aria-hidden className="text-ink-muted" />}
          />
        )}

        {alarms.map((a) => (
          <AlarmRow key={a.id} alarm={a} onEdit={() => setEditing(a)} />
        ))}

        {editing && (
          <AlarmEditor
            alarm={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}

        <NotificationHint />

        <p className="panel-inset px-4 py-3 text-xs leading-relaxed text-ink-muted">
          Honest limitation: web apps on iOS cannot ring after they are fully closed. Alarms fire
          while Field Unit is open or in the foreground; anything missed is flagged when you
          return. For wake-up-critical alarms, keep using the system Clock app.
        </p>
      </div>
    </ToolScreen>
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
    <div className={`panel flex items-center justify-between px-4 py-3 ${alarm.enabled ? "" : "opacity-60"}`}>
      <button type="button" onClick={onEdit} className="flex-1 text-left" aria-label={`Edit alarm ${alarm.name || formatMinutesOfDay(alarm.time, timeFormat)}`}>
        <p className="type-measure segments text-3xl">{formatMinutesOfDay(alarm.time, timeFormat)}</p>
        <p className="type-meta mt-1">
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
    if (alarm) {
      update(alarm.id, { time: minutes, name, repeat, sound, enabled: true });
    } else {
      add({ time: minutes, name, repeat, sound, enabled: true });
    }
    onClose();
  };

  return (
    <section className="panel flex flex-col gap-4 p-5" aria-label={alarm ? "Edit alarm" : "New alarm"}>
      <p className="type-label">{alarm ? "Edit alarm" : "New alarm"}</p>
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        aria-label="Alarm time"
        className="segments min-h-[56px] rounded-[12px] border border-line bg-surface px-4 text-center text-3xl outline-none"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Alarm name (optional)"
        aria-label="Alarm name"
        className="min-h-[44px] rounded-[12px] border border-line bg-surface px-3 text-sm outline-none"
      />
      <div>
        <p className="type-label mb-2">Repeat</p>
        <div className="flex gap-1.5" role="group" aria-label="Repeat on weekdays">
          {WEEKDAYS.map((w, i) => {
            const on = repeat.includes(w.day);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                aria-label={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]}
                onClick={() =>
                  setRepeat(on ? repeat.filter((d) => d !== w.day) : [...repeat, w.day])
                }
                className={`control h-11 flex-1 text-sm font-semibold ${on ? "bg-accent text-accent-ink" : ""}`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="type-label mb-2">Sound</p>
        <div className="flex gap-2">
          {ALARM_SOUNDS.map((s) => (
            <MechanicalButton
              key={s.id}
              size="sm"
              className="flex-1"
              active={sound === s.id}
              onClick={() => {
                setSound(s.id);
                playAlarmCycle(s.id);
              }}
            >
              {s.label}
            </MechanicalButton>
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
