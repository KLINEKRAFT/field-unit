"use client";

import { create } from "zustand";

/** Session-scoped stopwatch: survives navigation, resets with the app. */
interface StopwatchStore {
  running: boolean;
  /** epoch ms when started/resumed */
  startedAt: number | null;
  /** accumulated ms from previous run segments */
  accumulated: number;
  laps: number[];
  start: () => void;
  pause: () => void;
  reset: () => void;
  lap: (elapsed: number) => void;
}

export const useStopwatch = create<StopwatchStore>((set, get) => ({
  running: false,
  startedAt: null,
  accumulated: 0,
  laps: [],
  start: () => set({ running: true, startedAt: Date.now() }),
  pause: () => {
    const { startedAt, accumulated } = get();
    set({
      running: false,
      startedAt: null,
      accumulated: accumulated + (startedAt ? Date.now() - startedAt : 0),
    });
  },
  reset: () => set({ running: false, startedAt: null, accumulated: 0, laps: [] }),
  lap: (elapsed) => set({ laps: [elapsed, ...get().laps] }),
}));

export function stopwatchElapsed(s: Pick<StopwatchStore, "running" | "startedAt" | "accumulated">): number {
  return s.accumulated + (s.running && s.startedAt ? Date.now() - s.startedAt : 0);
}
