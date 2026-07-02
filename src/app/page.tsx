"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useNow } from "@/lib/hooks/useNow";
import { usePrefs } from "@/lib/stores/prefs";
import { useWeather } from "@/lib/stores/weather";
import { useAlarms, nextEnabledAlarm, nextFireTime } from "@/lib/stores/alarms";
import { useNotes, sortedNotes } from "@/lib/stores/notes";
import { useEvents, nextUpcomingEvent } from "@/lib/stores/events";
import { useRadio } from "@/lib/stores/radio";
import { useRecordings } from "@/lib/stores/recordings";
import { formatClock, formatDateShort, formatDuration, formatMinutesOfDay, tempLabel } from "@/lib/format";
import { conditionFromCode } from "@/lib/weather/provider";
import { WeatherGlyph } from "@/components/WeatherGlyph";
import { SpeakerPattern, StatusLight } from "@/components/controls";
import { DotMatrixDisplay } from "@/components/DotMatrixDisplay";

interface PanelProps {
  href: string;
  label: string;
  span?: "full" | "half";
  lightOn?: boolean;
  lightColor?: "accent" | "sage" | "alert";
  children: ReactNode;
}

function InstrumentPanel({ href, label, span = "half", lightOn = false, lightColor = "accent", children }: PanelProps) {
  return (
    <Link
      href={href}
      className={`panel flex min-h-[128px] flex-col justify-between p-4 transition-transform duration-150 active:scale-[0.985] ${
        span === "full" ? "col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="type-label">{label}</span>
        <StatusLight on={lightOn} color={lightColor} label={`${label} active`} />
      </div>
      {children}
    </Link>
  );
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

  const clock = formatClock(now, prefs.timeFormat, prefs.showSeconds);
  const nextAlarm = nextEnabledAlarm(alarms);
  const latestNote = sortedNotes(notes)[0];
  const nextEvent = nextUpcomingEvent(events);
  const latestRecording = recordings[0];
  const activeStation = radio.stations.find((s) => s.id === radio.activeId);
  const condition = weather ? conditionFromCode(weather.data.current.weatherCode) : null;

  return (
    <div className="mx-auto max-w-md px-4 pb-6">
      {/* Top area */}
      <header className="flex items-start justify-between pb-4 pt-3">
        <div>
          <h1 className="type-title text-2xl">Field Unit</h1>
          <p className="type-meta mt-1">
            {formatDateShort(now)}
            {weather ? ` · ${weather.locationName}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="type-measure segments text-xl">{clock.time}</p>
          {clock.suffix ? <p className="type-meta">{clock.suffix}</p> : null}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {/* Clock — full width */}
        <InstrumentPanel href="/clock" label="Clock" span="full" lightOn>
          <div className="flex flex-col gap-2">
            <p className="type-measure segments text-5xl" aria-label={`Current time ${clock.time}`}>
              {clock.time}
              {clock.suffix ? (
                <span className="ml-2 align-baseline text-lg text-ink-muted">{clock.suffix}</span>
              ) : null}
            </p>
            <div className="text-ink-muted">
              <DotMatrixDisplay
                text={
                  Intl.DateTimeFormat()
                    .resolvedOptions()
                    .timeZone.split("/")
                    .pop()
                    ?.replace(/_/g, " ")
                    .slice(0, 12) ?? "LOCAL"
                }
                dotSize={2.2}
                gap={1.1}
              />
            </div>
          </div>
        </InstrumentPanel>

        {/* Weather */}
        <InstrumentPanel href="/weather" label="Weather" lightOn={Boolean(weather)} lightColor="sage">
          {weather && condition ? (
            <div className="flex items-end justify-between">
              <div>
                <p className="type-measure text-4xl">
                  {tempLabel(weather.data.current.temperature, prefs.tempUnit)}
                </p>
                <p className="type-meta mt-1">{condition.label}</p>
              </div>
              <WeatherGlyph kind={condition.kind} size={52} className="text-ink" />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Tap to set location</p>
          )}
        </InstrumentPanel>

        {/* Compass */}
        <InstrumentPanel href="/compass" label="Compass">
          <div className="flex items-end justify-between">
            <p className="text-sm text-ink-muted">Tap to engage</p>
            <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden className="text-ink">
              <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i * Math.PI * 2) / 24;
                return (
                  <line
                    key={i}
                    x1={26 + Math.cos(a) * 21}
                    y1={26 + Math.sin(a) * 21}
                    x2={26 + Math.cos(a) * 24}
                    y2={26 + Math.sin(a) * 24}
                    stroke="currentColor"
                    strokeWidth={i % 6 === 0 ? 1.6 : 0.7}
                    opacity={i % 6 === 0 ? 0.9 : 0.4}
                  />
                );
              })}
              <polygon points="26,8 29,26 26,22 23,26" fill="var(--alert)" />
            </svg>
          </div>
        </InstrumentPanel>

        {/* Radio — full width with speaker pattern */}
        <InstrumentPanel
          href="/radio"
          label="Radio"
          span="full"
          lightOn={radio.status === "playing"}
          lightColor={radio.status === "error" ? "alert" : "accent"}
        >
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-ink">
                <DotMatrixDisplay
                  text={(activeStation?.name ?? "No station").slice(0, 12)}
                  dotSize={3}
                  gap={1.4}
                  fluid
                />
              </div>
              <p className="type-meta mt-2">
                {radio.status === "playing"
                  ? "On air"
                  : radio.status === "connecting"
                    ? "Tuning…"
                    : radio.status === "error"
                      ? "Stream error"
                      : "Standby"}
              </p>
            </div>
            <SpeakerPattern rows={7} cols={7} dotSize={3.5} gap={4.5} className="shrink-0 text-ink opacity-70" />
          </div>
        </InstrumentPanel>

        {/* Recorder */}
        <InstrumentPanel href="/recorder" label="Recorder" lightColor="alert">
          {latestRecording ? (
            <div>
              <p className="truncate text-sm font-semibold">{latestRecording.name}</p>
              <p className="type-meta mt-1">{formatDuration(latestRecording.duration)}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No recordings yet</p>
          )}
        </InstrumentPanel>

        {/* Alarm */}
        <InstrumentPanel href="/alarms" label="Alarm" lightOn={Boolean(nextAlarm)}>
          {nextAlarm ? (
            <div>
              <p className="type-measure segments text-3xl">
                {formatMinutesOfDay(nextAlarm.time, prefs.timeFormat)}
              </p>
              <p className="type-meta mt-1">
                {nextAlarm.name || formatDateShort(new Date(nextFireTime(nextAlarm)))}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No alarm set</p>
          )}
        </InstrumentPanel>

        {/* Notes */}
        <InstrumentPanel href="/notes" label="Notes" lightColor="sage">
          {latestNote ? (
            <div>
              <p className="truncate text-sm font-semibold">{latestNote.title || "Untitled"}</p>
              <p className="type-meta mt-1 line-clamp-1">{latestNote.body || "Empty note"}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No notes yet</p>
          )}
        </InstrumentPanel>

        {/* Calendar */}
        <InstrumentPanel href="/calendar" label="Calendar" lightColor="sage" lightOn={Boolean(nextEvent)}>
          {nextEvent ? (
            <div>
              <p className="truncate text-sm font-semibold">{nextEvent.title}</p>
              <p className="type-meta mt-1">{formatDateShort(new Date(nextEvent.start))}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No upcoming events</p>
          )}
        </InstrumentPanel>
      </div>
    </div>
  );
}
