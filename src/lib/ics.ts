import type { CalendarEvent, EventCategory } from "./types";

function icsDate(ts: number, allDay: boolean): string {
  const d = new Date(ts);
  if (allDay) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function eventsToICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Field Unit//Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@field-unit`,
      `DTSTAMP:${icsDate(e.updatedAt, false)}`,
      e.allDay ? `DTSTART;VALUE=DATE:${icsDate(e.start, true)}` : `DTSTART:${icsDate(e.start, false)}`,
      e.allDay ? `DTEND;VALUE=DATE:${icsDate(e.end + 86400000, true)}` : `DTEND:${icsDate(e.end, false)}`,
      `SUMMARY:${escapeText(e.title)}`,
    );
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.notes) lines.push(`DESCRIPTION:${escapeText(e.notes)}`);
    lines.push(`CATEGORIES:${e.category.toUpperCase()}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export interface ParsedICSEvent {
  title: string;
  start: number;
  end: number;
  allDay: boolean;
  location?: string;
  notes?: string;
  category: EventCategory;
}

function parseICSDate(value: string, isDateOnly: boolean): number {
  if (isDateOnly || /^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    return new Date(y, m, d).getTime();
  }
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6)) - 1;
  const d = Number(value.slice(6, 8));
  const hh = Number(value.slice(9, 11));
  const mm = Number(value.slice(11, 13));
  const ss = Number(value.slice(13, 15)) || 0;
  if (value.endsWith("Z")) return Date.UTC(y, m, d, hh, mm, ss);
  return new Date(y, m, d, hh, mm, ss).getTime();
}

function unescapeText(s: string): string {
  return s.replace(/\\n/gi, "\n").replace(/\\([;,\\])/g, "$1");
}

/** Basic VEVENT parser: SUMMARY, DTSTART, DTEND, LOCATION, DESCRIPTION. */
export function parseICS(text: string): ParsedICSEvent[] {
  // Unfold wrapped lines per RFC 5545
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: ParsedICSEvent[] = [];
  let current: Partial<ParsedICSEvent> & { hasDateOnly?: boolean } = {};
  let inEvent = false;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (current.title && current.start !== undefined) {
        const allDay = current.hasDateOnly ?? false;
        const start = current.start;
        let end = current.end ?? start;
        // ICS all-day DTEND is exclusive; store inclusive
        if (allDay && end > start) end -= 86400000;
        events.push({
          title: current.title,
          start,
          end: Math.max(end, start),
          allDay,
          location: current.location,
          notes: current.notes,
          category: "other",
        });
      }
      continue;
    }
    if (!inEvent) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const [key, params] = (line.slice(0, colon).split(";") as [string, ...string[]]);
    const value = line.slice(colon + 1);
    const isDateOnly = line.slice(0, colon).includes("VALUE=DATE") && !params?.includes("TIME");
    switch (key) {
      case "SUMMARY":
        current.title = unescapeText(value);
        break;
      case "DTSTART":
        current.start = parseICSDate(value, isDateOnly);
        if (isDateOnly || /^\d{8}$/.test(value)) current.hasDateOnly = true;
        break;
      case "DTEND":
        current.end = parseICSDate(value, isDateOnly);
        break;
      case "LOCATION":
        current.location = unescapeText(value);
        break;
      case "DESCRIPTION":
        current.notes = unescapeText(value);
        break;
    }
  }
  return events;
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
