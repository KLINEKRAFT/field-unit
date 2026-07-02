/** Core data models. All personal data is local-first (IndexedDB). */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0

export interface Alarm {
  id: string;
  name: string;
  /** minutes since midnight, local time */
  time: number;
  /** empty array = one-time alarm */
  repeat: Weekday[];
  sound: AlarmSoundId;
  enabled: boolean;
  createdAt: number;
  /** for one-time alarms: epoch ms of the scheduled ring, so we can auto-disable */
  nextFire?: number;
}

export type AlarmSoundId = "pulse" | "chime" | "ramp";

export type EventCategory = "personal" | "work" | "health" | "travel" | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  /** epoch ms */
  start: number;
  /** epoch ms */
  end: number;
  allDay: boolean;
  location?: string;
  notes?: string;
  category: EventCategory;
  /** reserved for a future version; not user-editable yet */
  recurrence?: { freq: "daily" | "weekly" | "monthly" | "yearly"; until?: number };
  createdAt: number;
  updatedAt: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  checklist: ChecklistItem[];
  pinned: boolean;
  recordingId?: string;
  eventId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Recording {
  id: string;
  name: string;
  /** ms */
  duration: number;
  mimeType: string;
  /** bytes */
  size: number;
  notes?: string;
  transcript?: string;
  createdAt: number;
}

export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  /** display frequency label, purely cosmetic (e.g. "98.1") */
  band?: string;
  createdAt: number;
}

export interface WeatherCache {
  latitude: number;
  longitude: number;
  locationName: string;
  fetchedAt: number;
  data: WeatherData;
}

export interface WeatherData {
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitationProbability: number;
    weatherCode: number;
    isDay: boolean;
  };
  hourly: Array<{
    time: number;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
  }>;
  daily: Array<{
    date: number;
    tempMin: number;
    tempMax: number;
    precipitationProbability: number;
    weatherCode: number;
  }>;
}

export type ThemeMode = "light" | "dark" | "system";
export type AccentId = "yellow" | "sage" | "orange" | "ice";
export type TimeFormat = "12h" | "24h";
export type TempUnit = "celsius" | "fahrenheit";
export type WindUnit = "kmh" | "mph" | "ms";

export interface WorldClock {
  id: string;
  label: string;
  timeZone: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  accent: AccentId;
  timeFormat: TimeFormat;
  showSeconds: boolean;
  tempUnit: TempUnit;
  windUnit: WindUnit;
  aiEnabled: boolean;
  worldClocks: WorldClock[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  accent: "yellow",
  timeFormat: "24h",
  showSeconds: true,
  tempUnit: "celsius",
  windUnit: "kmh",
  aiEnabled: false,
  worldClocks: [],
};

export type PermissionKind = "geolocation" | "motion" | "microphone" | "notifications";
export type PermissionStatus = "unknown" | "granted" | "denied" | "prompt" | "unsupported";

export type PermissionState = Record<PermissionKind, PermissionStatus>;

/** Persisted timer state so an active countdown survives navigation/reload. */
export interface TimerState {
  /** total ms configured */
  totalMs: number;
  /** epoch ms when the timer will finish (only while running) */
  endAt: number | null;
  /** ms remaining when paused */
  remainingMs: number;
  status: "idle" | "running" | "paused" | "done";
}
