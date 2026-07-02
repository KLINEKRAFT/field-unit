/**
 * Repository layer over IndexedDB. Components never touch IndexedDB directly —
 * they go through these functions (via stores), so storage can later be
 * replaced or synchronized without rebuilding the UI.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Alarm,
  CalendarEvent,
  Note,
  RadioStation,
  Recording,
  TimerState,
  UserPreferences,
  WeatherCache,
} from "./types";

interface FieldUnitDB extends DBSchema {
  alarms: { key: string; value: Alarm };
  events: { key: string; value: CalendarEvent; indexes: { byStart: number } };
  notes: { key: string; value: Note; indexes: { byUpdated: number } };
  recordings: { key: string; value: Recording; indexes: { byCreated: number } };
  audio: { key: string; value: { id: string; blob: Blob } };
  stations: { key: string; value: RadioStation };
  kv: { key: string; value: unknown };
}

const DB_NAME = "field-unit";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FieldUnitDB>> | null = null;

function getDB(): Promise<IDBPDatabase<FieldUnitDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FieldUnitDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("alarms", { keyPath: "id" });
        const events = db.createObjectStore("events", { keyPath: "id" });
        events.createIndex("byStart", "start");
        const notes = db.createObjectStore("notes", { keyPath: "id" });
        notes.createIndex("byUpdated", "updatedAt");
        const recordings = db.createObjectStore("recordings", { keyPath: "id" });
        recordings.createIndex("byCreated", "createdAt");
        db.createObjectStore("audio", { keyPath: "id" });
        db.createObjectStore("stations", { keyPath: "id" });
        db.createObjectStore("kv");
      },
    });
  }
  return dbPromise;
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------- generic ------------------------------- */

type EntityStore = "alarms" | "events" | "notes" | "recordings" | "stations";

async function listAll<T>(store: EntityStore): Promise<T[]> {
  const db = await getDB();
  return (await db.getAll(store)) as T[];
}

async function put<T>(store: EntityStore, value: T): Promise<void> {
  const db = await getDB();
  await db.put(store, value as never);
}

async function remove(store: EntityStore, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

/* ------------------------------ repositories --------------------------- */

export const alarmRepo = {
  list: () => listAll<Alarm>("alarms"),
  save: (a: Alarm) => put("alarms", a),
  delete: (id: string) => remove("alarms", id),
};

export const eventRepo = {
  list: () => listAll<CalendarEvent>("events"),
  save: (e: CalendarEvent) => put("events", e),
  delete: (id: string) => remove("events", id),
};

export const noteRepo = {
  list: () => listAll<Note>("notes"),
  save: (n: Note) => put("notes", n),
  delete: (id: string) => remove("notes", id),
};

export const stationRepo = {
  list: () => listAll<RadioStation>("stations"),
  save: (s: RadioStation) => put("stations", s),
  delete: (id: string) => remove("stations", id),
};

export const recordingRepo = {
  list: () => listAll<Recording>("recordings"),
  save: (r: Recording) => put("recordings", r),
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("recordings", id);
    await db.delete("audio", id);
  },
  async saveAudio(id: string, blob: Blob): Promise<void> {
    const db = await getDB();
    await db.put("audio", { id, blob });
  },
  async getAudio(id: string): Promise<Blob | null> {
    const db = await getDB();
    const row = await db.get("audio", id);
    return row?.blob ?? null;
  },
};

/* --------------------------------- kv ---------------------------------- */

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const db = await getDB();
    const v = await db.get("kv", key);
    return (v as T | undefined) ?? null;
  },
  async set(key: string, value: unknown): Promise<void> {
    const db = await getDB();
    await db.put("kv", value, key);
  },
  async delete(key: string): Promise<void> {
    const db = await getDB();
    await db.delete("kv", key);
  },
};

export const KV_KEYS = {
  preferences: "preferences",
  weatherCache: "weatherCache",
  timerState: "timerState",
  alarmLastTick: "alarmLastTick",
} as const;

export const prefsRepo = {
  get: () => kv.get<UserPreferences>(KV_KEYS.preferences),
  set: (p: UserPreferences) => kv.set(KV_KEYS.preferences, p),
};

export const weatherCacheRepo = {
  get: () => kv.get<WeatherCache>(KV_KEYS.weatherCache),
  set: (w: WeatherCache) => kv.set(KV_KEYS.weatherCache, w),
};

export const timerRepo = {
  get: () => kv.get<TimerState>(KV_KEYS.timerState),
  set: (t: TimerState) => kv.set(KV_KEYS.timerState, t),
};

/* ------------------------- export / import / wipe ----------------------- */

export interface ExportBundle {
  app: "field-unit";
  version: 1;
  exportedAt: number;
  alarms: Alarm[];
  events: CalendarEvent[];
  notes: Note[];
  stations: RadioStation[];
  recordings: Recording[]; // metadata only; audio blobs stay on-device
  preferences: UserPreferences | null;
}

export async function exportAllData(): Promise<ExportBundle> {
  const [alarms, events, notes, stations, recordings, preferences] = await Promise.all([
    alarmRepo.list(),
    eventRepo.list(),
    noteRepo.list(),
    stationRepo.list(),
    recordingRepo.list(),
    prefsRepo.get(),
  ]);
  return {
    app: "field-unit",
    version: 1,
    exportedAt: Date.now(),
    alarms,
    events,
    notes,
    stations,
    recordings,
    preferences,
  };
}

export async function importAllData(bundle: ExportBundle): Promise<void> {
  if (bundle.app !== "field-unit") throw new Error("Not a Field Unit export file.");
  await Promise.all([
    ...bundle.alarms.map((a) => alarmRepo.save(a)),
    ...bundle.events.map((e) => eventRepo.save(e)),
    ...bundle.notes.map((n) => noteRepo.save(n)),
    ...bundle.stations.map((s) => stationRepo.save(s)),
    ...bundle.recordings.map((r) => recordingRepo.save(r)),
  ]);
  if (bundle.preferences) await prefsRepo.set(bundle.preferences);
}

export async function deleteAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all(
    (["alarms", "events", "notes", "recordings", "audio", "stations", "kv"] as const).map((s) =>
      db.clear(s),
    ),
  );
}
