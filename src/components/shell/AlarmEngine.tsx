"use client";

/**
 * Global alarm watcher. Ticks while the app is open, rings due alarms with a
 * full-screen overlay, and detects alarms missed while the app was closed.
 * iOS PWAs cannot ring after the app is fully closed — Settings explains this.
 */
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { kv, KV_KEYS } from "@/lib/db";
import { useAlarms } from "@/lib/stores/alarms";
import { playAlarmCycle } from "@/lib/sound";
import { formatMinutesOfDay } from "@/lib/format";
import { usePrefs } from "@/lib/stores/prefs";
import { MechanicalButton } from "../controls";

const TICK_MS = 5000;

export function AlarmEngine() {
  const alarms = useAlarms((s) => s.alarms);
  const hydrated = useAlarms((s) => s.hydrated);
  const ringing = useAlarms((s) => s.ringing);
  const missed = useAlarms((s) => s.missed);
  const timeFormat = usePrefs((s) => s.prefs.timeFormat);
  const reduced = useReducedMotion();
  const soundLoop = useRef<ReturnType<typeof setInterval> | null>(null);
  const missedChecked = useRef(false);

  // Missed-alarm detection: compare last app tick with due times.
  useEffect(() => {
    if (!hydrated || missedChecked.current) return;
    missedChecked.current = true;
    void (async () => {
      const lastTick = await kv.get<number>(KV_KEYS.alarmLastTick);
      if (!lastTick) return;
      const now = Date.now();
      const missedNames = useAlarms
        .getState()
        .alarms.filter(
          (a) => a.enabled && a.nextFire && a.nextFire > lastTick && a.nextFire < now - 60_000,
        )
        .map((a) => {
          // roll one-time alarms off; reschedule repeating ones
          if (a.repeat.length === 0) {
            useAlarms.getState().update(a.id, { enabled: false });
          } else {
            useAlarms.getState().update(a.id, {});
          }
          return a.name || formatMinutesOfDay(a.time, "24h");
        });
      if (missedNames.length > 0) useAlarms.getState().setMissed(missedNames);
    })();
  }, [hydrated]);

  // Main tick: fire due alarms, persist heartbeat.
  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const now = Date.now();
      void kv.set(KV_KEYS.alarmLastTick, now);
      const state = useAlarms.getState();
      if (state.ringing) return;
      const due = state.alarms.find(
        (a) => a.enabled && a.nextFire !== undefined && a.nextFire <= now,
      );
      if (due) {
        state.setRinging(due.id);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(due.name || "Alarm", {
            body: `Field Unit — ${formatMinutesOfDay(due.time, "24h")}`,
          });
        }
      }
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [hydrated, alarms]);

  // Ring loop
  useEffect(() => {
    if (!ringing) {
      if (soundLoop.current) clearInterval(soundLoop.current);
      soundLoop.current = null;
      return;
    }
    const alarm = useAlarms.getState().alarms.find((a) => a.id === ringing);
    if (!alarm) return;
    playAlarmCycle(alarm.sound);
    soundLoop.current = setInterval(() => playAlarmCycle(alarm.sound), 1200);
    return () => {
      if (soundLoop.current) clearInterval(soundLoop.current);
    };
  }, [ringing]);

  const ringingAlarm = alarms.find((a) => a.id === ringing);

  const dismiss = () => {
    if (!ringingAlarm) return;
    if (ringingAlarm.repeat.length === 0) {
      useAlarms.getState().update(ringingAlarm.id, { enabled: false });
    } else {
      useAlarms.getState().update(ringingAlarm.id, {}); // recomputes nextFire
    }
    useAlarms.getState().setRinging(null);
  };

  const snooze = () => {
    if (!ringingAlarm) return;
    useAlarms.getState().snooze(ringingAlarm.id, 5 * 60 * 1000);
  };

  return (
    <>
      <AnimatePresence>
        {ringingAlarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8"
            style={{ background: "var(--surface)" }}
            role="alertdialog"
            aria-label={`Alarm: ${ringingAlarm.name || "Alarm"}`}
          >
            <motion.span
              aria-hidden
              animate={reduced ? {} : { scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="h-4 w-4 rounded-full"
              style={{ background: "var(--alert)" }}
            />
            <p className="type-label">Alarm</p>
            <p className="type-measure segments text-6xl">
              {formatMinutesOfDay(ringingAlarm.time, timeFormat)}
            </p>
            {ringingAlarm.name ? <p className="text-lg">{ringingAlarm.name}</p> : null}
            <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
              <MechanicalButton variant="primary" size="lg" onClick={dismiss}>
                Stop
              </MechanicalButton>
              <MechanicalButton size="md" onClick={snooze}>
                Snooze 5 min
              </MechanicalButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missed.length > 0 && !ringingAlarm && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.26 }}
            className="fixed left-4 right-4 z-40"
            style={{ top: "calc(var(--sat) + 8px)" }}
            role="status"
          >
            <div className="panel mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
              <p className="text-sm">
                <span className="type-label mr-2" style={{ color: "var(--alert)" }}>
                  Missed
                </span>
                {missed.join(", ")}
              </p>
              <MechanicalButton
                size="sm"
                variant="ghost"
                onClick={() => useAlarms.getState().dismissMissed()}
              >
                OK
              </MechanicalButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
