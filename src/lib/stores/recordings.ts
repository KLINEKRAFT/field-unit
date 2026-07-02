"use client";

import { create } from "zustand";
import { recordingRepo, uid } from "../db";
import type { Recording } from "../types";

interface RecordingsStore {
  recordings: Recording[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (data: Omit<Recording, "id" | "createdAt">, blob: Blob) => Promise<Recording>;
  update: (id: string, patch: Partial<Recording>) => void;
  remove: (id: string) => void;
}

export const useRecordings = create<RecordingsStore>((set, get) => ({
  recordings: [],
  hydrated: false,
  hydrate: async () => {
    const recordings = await recordingRepo.list();
    recordings.sort((a, b) => b.createdAt - a.createdAt);
    set({ recordings, hydrated: true });
  },
  add: async (data, blob) => {
    const recording: Recording = { ...data, id: uid(), createdAt: Date.now() };
    await recordingRepo.saveAudio(recording.id, blob);
    await recordingRepo.save(recording);
    set({ recordings: [recording, ...get().recordings] });
    return recording;
  },
  update: (id, patch) => {
    const recordings = get().recordings.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      void recordingRepo.save(next);
      return next;
    });
    set({ recordings });
  },
  remove: (id) => {
    set({ recordings: get().recordings.filter((r) => r.id !== id) });
    void recordingRepo.delete(id);
  },
}));
