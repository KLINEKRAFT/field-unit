import type { TempUnit, TimeFormat, WindUnit } from "./types";

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatClock(
  date: Date,
  format: TimeFormat,
  withSeconds: boolean,
  timeZone?: string,
): { time: string; suffix: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: format === "12h",
    timeZone,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = format === "24h" ? pad2(Number(get("hour"))) : get("hour");
  const time = withSeconds
    ? `${hour}:${get("minute")}:${get("second")}`
    : `${hour}:${get("minute")}`;
  return { time, suffix: format === "12h" ? get("dayPeriod").toUpperCase() : "" };
}

export function formatMinutesOfDay(minutes: number, format: TimeFormat): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (format === "24h") return `${pad2(h)}:${pad2(m)}`;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${period}`;
}

export function formatDuration(ms: number, withMs = false): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const base = h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
  if (!withMs) return base;
  const cs = Math.floor((ms % 1000) / 10);
  return `${base}.${pad2(cs)}`;
}

export function formatDateShort(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateLong(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(ts),
  );
}

export function convertTemp(celsius: number, unit: TempUnit): number {
  return unit === "fahrenheit" ? (celsius * 9) / 5 + 32 : celsius;
}

export function tempLabel(celsius: number, unit: TempUnit): string {
  return `${Math.round(convertTemp(celsius, unit))}°`;
}

export function convertWind(kmh: number, unit: WindUnit): { value: number; label: string } {
  switch (unit) {
    case "mph":
      return { value: kmh * 0.621371, label: "MPH" };
    case "ms":
      return { value: kmh / 3.6, label: "M/S" };
    default:
      return { value: kmh, label: "KM/H" };
  }
}

export function cardinalFromDegrees(deg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16] ?? "N";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
