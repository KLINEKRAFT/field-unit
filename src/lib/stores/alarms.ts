"use client";

import { create } from "zustand";
import { alarmRepo, uid } from "../db";
import type { Alarm, Weekday } from "../types";

/** Computes the next epoch ms at which the alarm should fire, from `from`. */
export function nextFireTime(alarm: Alarm, from = Date.now()): number {
  const base = new Date(from);
  const candidate = new Date(base);
  candidate.setHours(Math.floor(alarm.time / 60), alarm.time % 60, 0, 0);

  if (alarm.repeat.length === 0) {
    if (candidate.getTime() <= from) candidate.setDate(candidate.getDate() + 1);
    return candidate.getTime();
  }
  for (let i = 0; i < 8; i++) {
    const day = new Date(base);
    day.setDate(base.getDate() + i);
    day.setHours(Math.floor(alarm.time / 60), alarm.time % 60, 0, 0);
    if (day.getTime() > from && alarm.repeat.includes(day.getDay() as Weekday)) {
      return day.getTime();
    }
  }
  return candidate.getTime();
}

interface AlarmStore {
  alarms: Alarm[];
  hydrated: boolean;
  /** id of the alarm currently ringing, if any */
  ringing: string | null;
  /** names of alarms detected as missed while the app was closed */
  missed: string[];
  hydrate: () => Promise<void>;
  add: (data: Omit<Alarm, "id" | "createdAt" | "nextFire">) => void;
  update: (id: string, patch: Partial<Alarm>) => void;
  remove: (id: string) => void;
  /** postpones the next fire without recomputing from the schedule */
  snooze: (id: string, ms: number) => void;
  setRinging: (id: string | null) => void;
  setMissed: (names: string[]) => void;
  dismissMissed: () => void;
}

export const useAlarms = create<AlarmStore>((set, get) => ({
  alarms: [],
  hydrated: false,
  ringing: null,
  missed: [],
  hydrate: async () => {
    const alarms = await alarmRepo.list();
    alarms.sort((a, b) => a.time - b.time);
    set({ alarms, hydrated: true });
  },
  add: (data) => {
    const alarm: Alarm = { ...data, id: uid(), createdAt: Date.now() };
    alarm.nextFire = nextFireTime(alarm);
    const alarms = [...get().alarms, alarm].sort((a, b) => a.time - b.time);
    set({ alarms });
    void alarmRepo.save(alarm);
  },
  update: (id, patch) => {
    const alarms = get().alarms.map((a) => {
      if (a.id !== id) return a;
      const next = { ...a, ...patch };
      next.nextFire = next.enabled ? nextFireTime(next) : undefined;
      void alarmRepo.save(next);
      return next;
    });
    set({ alarms });
  },
  remove: (id) => {
    set({ alarms: get().alarms.filter((a) => a.id !== id) });
    void alarmRepo.delete(id);
  },
  snooze: (id, ms) => {
    const alarms = get().alarms.map((a) => {
      if (a.id !== id) return a;
      const next = { ...a, nextFire: Date.now() + ms };
      void alarmRepo.save(next);
      return next;
    });
    set({ alarms, ringing: null });
  },
  setRinging: (id) => set({ ringing: id }),
  setMissed: (names) => set({ missed: names }),
  dismissMissed: () => set({ missed: [] }),
}));

export function nextEnabledAlarm(alarms: Alarm[]): Alarm | null {
  const enabled = alarms.filter((a) => a.enabled);
  if (enabled.length === 0) return null;
  return enabled.reduce((best, a) =>
    nextFireTime(a) < nextFireTime(best) ? a : best,
  );
}
