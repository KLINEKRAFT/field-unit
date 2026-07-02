"use client";

import { create } from "zustand";
import { timerRepo } from "../db";
import type { TimerState } from "../types";
import { playTimerDone } from "../sound";

const IDLE: TimerState = { totalMs: 0, endAt: null, remainingMs: 0, status: "idle" };

interface TimerStore extends TimerState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  start: (totalMs: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  /** called by the ticking UI when the deadline passes */
  complete: () => void;
}

function persist(state: TimerState): void {
  void timerRepo.set(state);
}

export const useTimer = create<TimerStore>((set, get) => ({
  ...IDLE,
  hydrated: false,

  hydrate: async () => {
    const saved = await timerRepo.get();
    if (!saved) {
      set({ hydrated: true });
      return;
    }
    if (saved.status === "running" && saved.endAt !== null) {
      if (saved.endAt <= Date.now()) {
        set({ ...saved, status: "done", endAt: null, remainingMs: 0, hydrated: true });
      } else {
        set({ ...saved, hydrated: true });
      }
    } else {
      set({ ...saved, hydrated: true });
    }
  },

  start: (totalMs) => {
    const state: TimerState = {
      totalMs,
      endAt: Date.now() + totalMs,
      remainingMs: totalMs,
      status: "running",
    };
    set(state);
    persist(state);
  },

  pause: () => {
    const { endAt, totalMs } = get();
    if (endAt === null) return;
    const state: TimerState = {
      totalMs,
      endAt: null,
      remainingMs: Math.max(0, endAt - Date.now()),
      status: "paused",
    };
    set(state);
    persist(state);
  },

  resume: () => {
    const { remainingMs, totalMs } = get();
    const state: TimerState = {
      totalMs,
      endAt: Date.now() + remainingMs,
      remainingMs,
      status: "running",
    };
    set(state);
    persist(state);
  },

  reset: () => {
    set(IDLE);
    persist(IDLE);
  },

  complete: () => {
    const state: TimerState = { ...get(), endAt: null, remainingMs: 0, status: "done" };
    set(state);
    persist(state);
    playTimerDone();
  },
}));
