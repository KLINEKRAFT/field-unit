"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEvents, eventsOnDay } from "@/lib/stores/events";
import { usePrefs } from "@/lib/stores/prefs";
import { MechanicalButton } from "@/components/controls";
import { EmptyState } from "@/components/states";
import { eventsToICS, parseICS, downloadFile } from "@/lib/ics";
import { formatClock, formatDateLong, pad2 } from "@/lib/format";
import type { CalendarEvent, EventCategory } from "@/lib/types";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Download, Upload, Trash2 } from "lucide-react";

type View = "month" | "agenda" | "day";

const CATEGORIES: Array<{ id: EventCategory; label: string; color: string }> = [
  { id: "personal", label: "Personal", color: "var(--accent)" },
  { id: "work", label: "Work", color: "var(--ink)" },
  { id: "health", label: "Health", color: "var(--sage)" },
  { id: "travel", label: "Travel", color: "var(--alert)" },
  { id: "other", label: "Other", color: "var(--ink-muted)" },
];

export default function CalendarPage() {
  const router = useRouter();
  const events = useEvents((s) => s.events);
  const importMany = useEvents((s) => s.importMany);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [editing, setEditing] = useState<CalendarEvent | "new" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(cursor);

  const importICS = async (file: File) => {
    try {
      const parsed = parseICS(await file.text());
      if (parsed.length === 0) {
        setImportMsg("No events found in that file.");
        return;
      }
      const count = importMany(parsed);
      setImportMsg(`Imported ${count} event${count === 1 ? "" : "s"}.`);
    } catch {
      setImportMsg("That file could not be read as ICS.");
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 pb-8">
      <header className="pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Back to instruments"
            className="-ml-2 flex h-11 w-11 items-center justify-center text-ink"
          >
            <ArrowLeft size={20} strokeWidth={2.2} aria-hidden />
          </button>
          <div className="flex">
            <button type="button" aria-label="Export ICS" className="flex h-11 w-11 items-center justify-center text-ink-muted" onClick={() => downloadFile("field-unit-calendar.ics", eventsToICS(events), "text/calendar")}>
              <Download size={16} aria-hidden />
            </button>
            <button type="button" aria-label="Import ICS" className="flex h-11 w-11 items-center justify-center text-ink-muted" onClick={() => fileRef.current?.click()}>
              <Upload size={16} aria-hidden />
            </button>
            <button type="button" aria-label="New event" className="-mr-2 flex h-11 w-11 items-center justify-center text-ink" onClick={() => setEditing("new")}>
              <Plus size={22} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        </div>
        <h1 className="type-title pt-1 text-[32px]">Calendar</h1>
        <input
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          className="hidden"
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importICS(f);
            e.target.value = "";
          }}
        />
      </header>

      {importMsg && (
        <p className="mb-3 text-sm text-ink-muted" role="status">
          {importMsg}{" "}
          <button type="button" className="underline" onClick={() => setImportMsg(null)}>
            OK
          </button>
        </p>
      )}

      <div className="mb-4 flex gap-6 hairline-b" role="tablist" aria-label="Calendar view">
        {(["month", "agenda", "day"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className="text-tab"
          >
            {v}
          </button>
        ))}
      </div>

      {view === "month" && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Previous month" className="flex h-11 w-11 items-center justify-center text-ink" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft size={18} aria-hidden />
            </button>
            <h2 className="text-base font-bold">{monthLabel}</h2>
            <button type="button" aria-label="Next month" className="flex h-11 w-11 items-center justify-center text-ink" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
          <MonthGrid
            cursor={cursor}
            events={events}
            selected={selectedDay}
            onSelect={(d) => {
              setSelectedDay(d);
              setView("day");
            }}
          />
        </>
      )}

      {view === "agenda" && <AgendaView events={events} onEdit={setEditing} />}

      {view === "day" && (
        <DayView
          day={selectedDay}
          events={events}
          onPrev={() => setSelectedDay(new Date(selectedDay.getTime() - 86400000))}
          onNext={() => setSelectedDay(new Date(selectedDay.getTime() + 86400000))}
          onEdit={setEditing}
        />
      )}

      {editing && (
        <EventEditor
          event={editing === "new" ? null : editing}
          defaultDay={selectedDay}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MonthGrid({
  cursor,
  events,
  selected,
  onSelect,
}: {
  cursor: Date;
  events: CalendarEvent[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first grid
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const list: Array<Date | null> = [];
    for (let i = 0; i < startOffset; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return list;
  }, [cursor]);

  const today = new Date();
  const isSame = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-2">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="type-label text-center text-[10px]">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) =>
          day === null ? (
            <span key={`x${i}`} aria-hidden />
          ) : (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onSelect(day)}
              aria-label={formatDateLong(day)}
              className={`flex aspect-square flex-col items-center justify-center rounded-full text-sm tnum transition-colors ${
                isSame(day, today)
                  ? "bg-accent font-bold text-accent-ink"
                  : isSame(day, selected)
                    ? "font-bold underline underline-offset-4"
                    : ""
              }`}
            >
              {day.getDate()}
              <span className="mt-0.5 flex h-1.5 gap-0.5" aria-hidden>
                {eventsOnDay(events, day)
                  .slice(0, 3)
                  .map((e) => (
                    <span
                      key={e.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: CATEGORIES.find((c) => c.id === e.category)?.color }}
                    />
                  ))}
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function EventCard({ event, onEdit }: { event: CalendarEvent; onEdit: (e: CalendarEvent) => void }) {
  const timeFormat = usePrefs((s) => s.prefs.timeFormat);
  const cat = CATEGORIES.find((c) => c.id === event.category);
  return (
    <button type="button" onClick={() => onEdit(event)} className="flex w-full items-center gap-3 py-3 text-left hairline-b last:border-b-0">
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: cat?.color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{event.title}</span>
        <span className="type-meta mt-0.5 block">
          {event.allDay
            ? "All day"
            : `${formatClock(new Date(event.start), timeFormat, false).time}–${formatClock(new Date(event.end), timeFormat, false).time}`}
          {event.location ? ` · ${event.location}` : ""}
        </span>
      </span>
    </button>
  );
}

function AgendaView({ events, onEdit }: { events: CalendarEvent[]; onEdit: (e: CalendarEvent) => void }) {
  const upcoming = events.filter((e) => e.end >= Date.now() - 86400000).slice(0, 50);
  if (upcoming.length === 0) {
    return <EmptyState title="Nothing scheduled" message="Upcoming events will appear here in order." />;
  }
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of upcoming) {
    const key = new Date(e.start).toDateString();
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return (
    <div className="flex flex-col gap-4">
      {Array.from(groups.entries()).map(([day, list]) => (
        <section key={day}>
          <h2 className="type-label pb-2">{formatDateLong(new Date(day))}</h2>
          <div className="flex flex-col gap-2">
            {list.map((e) => (
              <EventCard key={e.id} event={e} onEdit={onEdit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DayView({
  day,
  events,
  onPrev,
  onNext,
  onEdit,
}: {
  day: Date;
  events: CalendarEvent[];
  onPrev: () => void;
  onNext: () => void;
  onEdit: (e: CalendarEvent) => void;
}) {
  const list = eventsOnDay(events, day);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous day" className="flex h-11 w-11 items-center justify-center text-ink" onClick={onPrev}>
          <ChevronLeft size={18} aria-hidden />
        </button>
        <h2 className="text-sm font-bold">{formatDateLong(day)}</h2>
        <button type="button" aria-label="Next day" className="flex h-11 w-11 items-center justify-center text-ink" onClick={onNext}>
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
      {list.length === 0 ? (
        <EmptyState title="Free day" message="No events on this day." />
      ) : (
        list.map((e) => <EventCard key={e.id} event={e} onEdit={onEdit} />)
      )}
    </div>
  );
}

/* -------------------------------- editor -------------------------------- */

function toLocalInput(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function EventEditor({
  event,
  defaultDay,
  onClose,
}: {
  event: CalendarEvent | null;
  defaultDay: Date;
  onClose: () => void;
}) {
  const { add, update, remove } = useEvents();
  const base = event?.start ?? new Date(defaultDay).setHours(9, 0, 0, 0);
  const [title, setTitle] = useState(event?.title ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startDate, setStartDate] = useState(toLocalInput(base).date);
  const [startTime, setStartTime] = useState(toLocalInput(base).time);
  const [endDate, setEndDate] = useState(toLocalInput(event?.end ?? base + 3600000).date);
  const [endTime, setEndTime] = useState(toLocalInput(event?.end ?? base + 3600000).time);
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [category, setCategory] = useState<EventCategory>(event?.category ?? "personal");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = () => {
    const start = allDay
      ? new Date(`${startDate}T00:00`).getTime()
      : new Date(`${startDate}T${startTime}`).getTime();
    const end = allDay
      ? new Date(`${endDate}T23:59`).getTime()
      : new Date(`${endDate}T${endTime}`).getTime();
    if (!title.trim() || Number.isNaN(start) || Number.isNaN(end) || end < start) return;
    const data = { title: title.trim(), start, end, allDay, location: location.trim() || undefined, notes: notes.trim() || undefined, category };
    if (event) update(event.id, data);
    else add(data);
    onClose();
  };

  const inputCls = "flat-input px-0 text-sm";

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-surface"
      style={{ paddingTop: "calc(var(--sat) + 16px)", paddingBottom: "calc(var(--sab) + 24px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={event ? "Edit event" : "New event"}
    >
      <section className="mx-auto flex max-w-md flex-col gap-4 px-6 py-4">
        <p className="type-label">{event ? "Edit event" : "New event"}</p>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" aria-label="Event title" className={inputCls} />
        <label className="flex items-center justify-between py-1">
          <span className="type-label">All day</span>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="type-label text-[9px]">Starts</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} aria-label="Start date" />
          </label>
          {!allDay && (
            <label className="flex flex-col gap-1">
              <span className="type-label text-[9px]">Time</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} aria-label="Start time" />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="type-label text-[9px]">Ends</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} aria-label="End date" />
          </label>
          {!allDay && (
            <label className="flex flex-col gap-1">
              <span className="type-label text-[9px]">Time</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} aria-label="End time" />
            </label>
          )}
        </div>
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" aria-label="Location" className={inputCls} />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" aria-label="Notes" rows={2} className={`${inputCls} resize-none py-2`} />
        <div className="flex flex-wrap gap-4" role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`flex min-h-[44px] items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
                category === c.id ? "text-ink underline underline-offset-4" : "text-ink-muted"
              }`}
            >
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              {c.label}
            </button>
          ))}
        </div>

        {confirmDelete ? (
          <div className="flex gap-2">
            <MechanicalButton variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Keep
            </MechanicalButton>
            <MechanicalButton variant="danger" className="flex-1" onClick={() => { if (event) remove(event.id); onClose(); }}>
              Delete event
            </MechanicalButton>
          </div>
        ) : (
          <div className="flex gap-2">
            {event && (
              <MechanicalButton variant="ghost" ariaLabel="Delete event" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} aria-hidden style={{ color: "var(--alert)" }} />
              </MechanicalButton>
            )}
            <MechanicalButton variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </MechanicalButton>
            <MechanicalButton variant="primary" className="flex-1" disabled={!title.trim()} onClick={save}>
              Save
            </MechanicalButton>
          </div>
        )}
      </section>
    </div>
  );
}
