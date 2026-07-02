"use client";

import { create } from "zustand";
import { noteRepo, uid } from "../db";
import type { Note } from "../types";

interface NotesStore {
  notes: Note[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (partial?: Partial<Note>) => Note;
  update: (id: string, patch: Partial<Note>) => void;
  remove: (id: string) => void;
}

export const useNotes = create<NotesStore>((set, get) => ({
  notes: [],
  hydrated: false,
  hydrate: async () => {
    const notes = await noteRepo.list();
    notes.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ notes, hydrated: true });
  },
  create: (partial) => {
    const now = Date.now();
    const note: Note = {
      id: uid(),
      title: "",
      body: "",
      tags: [],
      checklist: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    set({ notes: [note, ...get().notes] });
    void noteRepo.save(note);
    return note;
  },
  update: (id, patch) => {
    const notes = get().notes.map((n) => {
      if (n.id !== id) return n;
      const next = { ...n, ...patch, updatedAt: Date.now() };
      void noteRepo.save(next);
      return next;
    });
    notes.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ notes });
  },
  remove: (id) => {
    set({ notes: get().notes.filter((n) => n.id !== id) });
    void noteRepo.delete(id);
  },
}));

export function sortedNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}
