"use client";

import { create } from "zustand";
import { eventRepo, uid } from "../db";
import type { CalendarEvent } from "../types";

interface EventsStore {
  events: CalendarEvent[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => void;
  update: (id: string, patch: Partial<CalendarEvent>) => void;
  remove: (id: string) => void;
  importMany: (events: Array<Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">>) => number;
}

export const useEvents = create<EventsStore>((set, get) => ({
  events: [],
  hydrated: false,
  hydrate: async () => {
    const events = await eventRepo.list();
    events.sort((a, b) => a.start - b.start);
    set({ events, hydrated: true });
  },
  add: (data) => {
    const now = Date.now();
    const event: CalendarEvent = { ...data, id: uid(), createdAt: now, updatedAt: now };
    const events = [...get().events, event].sort((a, b) => a.start - b.start);
    set({ events });
    void eventRepo.save(event);
  },
  update: (id, patch) => {
    const events = get().events.map((e) => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch, updatedAt: Date.now() };
      void eventRepo.save(next);
      return next;
    });
    events.sort((a, b) => a.start - b.start);
    set({ events });
  },
  remove: (id) => {
    set({ events: get().events.filter((e) => e.id !== id) });
    void eventRepo.delete(id);
  },
  importMany: (list) => {
    const now = Date.now();
    const created = list.map((data) => {
      const event: CalendarEvent = { ...data, id: uid(), createdAt: now, updatedAt: now };
      void eventRepo.save(event);
      return event;
    });
    const events = [...get().events, ...created].sort((a, b) => a.start - b.start);
    set({ events });
    return created.length;
  },
}));

export function nextUpcomingEvent(events: CalendarEvent[]): CalendarEvent | null {
  const now = Date.now();
  const upcoming = events.filter((e) => e.end >= now).sort((a, b) => a.start - b.start);
  return upcoming[0] ?? null;
}

export function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return events
    .filter((e) => e.start <= end.getTime() && e.end >= start.getTime())
    .sort((a, b) => a.start - b.start);
}
