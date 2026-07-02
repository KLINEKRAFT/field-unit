"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useNow } from "@/lib/hooks/useNow";
import { usePrefs } from "@/lib/stores/prefs";
import { useWeather } from "@/lib/stores/weather";
import { useAlarms, nextEnabledAlarm } from "@/lib/stores/alarms";
import { useNotes, sortedNotes } from "@/lib/stores/notes";
import { useEvents, nextUpcomingEvent } from "@/lib/stores/events";
import { useRadio } from "@/lib/stores/radio";
import { useRecordings } from "@/lib/stores/recordings";
import {
  formatClock,
  formatDateShort,
  formatDuration,
  formatMinutesOfDay,
  tempLabel,
} from "@/lib/format";
import { conditionFromCode } from "@/lib/weather/provider";
import { WeatherGlyph } from "@/components/WeatherGlyph";
import { DotIcon } from "@/components/DotIcon";

/** Fixed identity color per instrument, from the kit palette. */
const TOOL_COLORS = {
  orange: "#ed8008",
  flame: "#ed3f1c",
  oxide: "#bf1b1b",
  olive: "#736b1e",
  ink: "var(--ink)",
} as const;

interface CardSpec {
  href: string;
  name: string;
  index: string;
  icon: ReactNode;
  color: string;
  meta: string;
}

export default function InstrumentBoard() {
  const now = useNow(1000);
  const prefs = usePrefs((s) => s.prefs);
  const weather = useWeather((s) => s.cache);
  const alarms = useAlarms((s) => s.alarms);
  const notes = useNotes((s) => s.notes);
  const events = useEvents((s) => s.events);
  const radio = useRadio();
  const recordings = useRecordings((s) => s.recordings);
  const reduced = useReducedMotion();

  const clock = formatClock(now, prefs.timeFormat, prefs.showSeconds);
  const nextAlarm = nextEnabledAlarm(alarms);
  const latestNote = sortedNotes(notes)[0];
  const nextEvent = nextUpcomingEvent(events);
  const latestRecording = recordings[0];
  const activeStation = radio.stations.find((s) => s.id === radio.activeId);
  const condition = weather ? conditionFromCode(weather.data.current.weatherCode) : null;

  const cards: CardSpec[] = [
    {
      href: "/weather",
      name: "Weather",
      index: "01",
      color: TOOL_COLORS.orange,
      icon: condition ? (
        <WeatherGlyph kind={condition.kind} size={64} label={condition.label} />
      ) : (
        <DotIcon name="weather" size={56} />
      ),
      meta:
        weather && condition
          ? `${tempLabel(weather.data.current.temperature, prefs.tempUnit)} ${condition.label}`
          : "Standby",
    },
    {
      href: "/compass",
      name: "Compass",
      index: "02",
      color: TOOL_COLORS.olive,
      icon: <DotIcon name="compass" size={56} />,
      meta: "Tap to engage",
    },
    {
      href: "/radio",
      name: "Radio",
      index: "03",
      color: TOOL_COLORS.flame,
      icon: <DotIcon name="radio" size={56} />,
      meta:
        radio.status === "playing"
          ? `On air · ${activeStation?.name ?? ""}`
          : radio.status === "connecting"
            ? "Tuning…"
            : (activeStation?.name ?? "Standby"),
    },
    {
      href: "/recorder",
      name: "Recorder",
      index: "04",
      color: TOOL_COLORS.oxide,
      icon: <DotIcon name="recorder" size={56} />,
      meta: latestRecording
        ? `${latestRecording.name.slice(0, 16)} · ${formatDuration(latestRecording.duration)}`
        : "No takes yet",
    },
    {
      href: "/notes",
      name: "Notes",
      index: "05",
      color: TOOL_COLORS.ink,
      icon: <DotIcon name="notes" size={56} />,
      meta: latestNote ? latestNote.title || "Untitled" : "Empty",
    },
    {
      href: "/calendar",
      name: "Calendar",
      index: "06",
      color: TOOL_COLORS.olive,
      icon: <DotIcon name="calendar" size={56} />,
      meta: nextEvent
        ? `${nextEvent.title.slice(0, 14)} · ${formatDateShort(new Date(nextEvent.start))}`
        : "Nothing scheduled",
    },
    {
      href: "/clock",
      name: "Clock",
      index: "07",
      color: TOOL_COLORS.ink,
      icon: <DotIcon name="clock" size={56} />,
      meta: `${clock.time}${clock.suffix ? ` ${clock.suffix}` : ""}`,
    },
    {
      href: "/alarms",
      name: "Alarm",
      index: "08",
      color: TOOL_COLORS.flame,
      icon: <DotIcon name="alarm" size={56} />,
      meta: nextAlarm
        ? `Armed · ${formatMinutesOfDay(nextAlarm.time, prefs.timeFormat)}`
        : "Not set",
    },
  ];

  return (
    <div className="mx-auto max-w-md px-5 pb-8">
      {/* Wordmark header */}
      <header className="flex items-start justify-between pb-1 pt-4">
        <h1 className="type-title text-[34px]">
          FIELD
          <br />
          <span className="font-normal lowercase">unit</span>
        </h1>
        <p className="type-label pt-1 text-right leading-relaxed">
          Portable
          <br />
          Toolkit — 01
        </p>
      </header>
      <p className="type-label pb-5 pt-1 tracking-[0.14em]">
        {formatDateShort(now)} · {weather?.locationName ?? "Tulsa, OK"}
      </p>

      {/* Instrument cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.href}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: reduced ? 0 : i * 0.045, ease: "easeOut" }}
          >
            <Link
              href={card.href}
              className="panel flex min-h-[168px] flex-col justify-between p-4 transition-transform duration-150 active:scale-[0.985]"
            >
              <div className="flex items-start justify-between">
                <span className="text-ink">{card.icon}</span>
                <span
                  aria-hidden
                  className="mt-1 h-2 w-2 rounded-full"
                  style={{ background: card.color }}
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-bold">{card.name}</span>
                  <span className="type-meta">{card.index}</span>
                </div>
                <p className="type-meta mt-0.5 truncate">{card.meta}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
