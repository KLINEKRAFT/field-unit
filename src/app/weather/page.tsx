"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ToolScreen } from "@/components/ToolScreen";
import { TintablePage } from "@/components/TintablePage";
import { MechanicalButton } from "@/components/controls";
import { EmptyState, ErrorState, PermissionCard } from "@/components/states";
import { WeatherGlyph } from "@/components/WeatherGlyph";
import { useWeather } from "@/lib/stores/weather";
import { usePrefs } from "@/lib/stores/prefs";
import { conditionFromCode } from "@/lib/weather/provider";
import type { GeocodeResult } from "@/lib/weather/provider";
import { weatherProvider } from "@/lib/weather/openMeteo";
import {
  cardinalFromDegrees,
  convertTemp,
  convertWind,
  formatRelative,
  tempLabel,
} from "@/lib/format";
import type { TempUnit } from "@/lib/types";
import { ChevronDown, Droplet, RefreshCw, Search, Thermometer, Wind } from "lucide-react";

export default function WeatherPage() {
  const weather = useWeather();
  const prefs = usePrefs((s) => s.prefs);
  const [searchOpen, setSearchOpen] = useState(false);
  const reduced = useReducedMotion();

  const cache = weather.cache;
  const condition = cache ? conditionFromCode(cache.data.current.weatherCode) : null;

  // Opening the instrument means you want the current sky — refresh anything
  // older than two minutes so a brief cached storm code can't linger.
  const refreshIfStale = weather.refreshIfStale;
  useEffect(() => {
    void refreshIfStale(2 * 60 * 1000);
  }, [refreshIfStale]);

  return (
    <TintablePage page="weather">
    <ToolScreen
      title={cache?.locationName ?? "Weather"}
      mode={weather.state === "loading" ? "SYNC" : cache ? "LIVE" : "STANDBY"}
      lightOn={Boolean(cache)}
      lightColor="sage"
      actions={
        cache ? (
          <button
            type="button"
            aria-label="Refresh weather"
            onClick={() => void weather.refresh()}
            className="-mr-2 flex h-11 w-11 items-center justify-center text-ink-muted"
          >
            <RefreshCw
              size={16}
              aria-hidden
              className={weather.state === "loading" ? "animate-spin" : ""}
            />
          </button>
        ) : undefined
      }
    >
      <div className="mx-auto flex max-w-md flex-col gap-2">
        {cache && condition && (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={`Change location, currently ${cache.locationName}`}
            className="-mt-4 flex items-center gap-2 text-left"
          >
            <span className="text-xl font-bold text-ink-muted">
              {tempLabel(cache.data.current.temperature, prefs.tempUnit)}{" "}
              {condition.label}
            </span>
            <ChevronDown size={18} aria-hidden className="text-ink" />
          </button>
        )}

        {!cache && weather.state === "idle" && (
          <PermissionCard
            title="Location"
            explanation="Weather needs a place to report on. Use your current position (asks for browser location permission) or search for a city."
            actionLabel="Use my location"
            onAction={() => void weather.useMyLocation()}
            secondary={{ label: "Search for a city", onClick: () => setSearchOpen(true) }}
          />
        )}
        {!cache && weather.state === "loading" && (
          <EmptyState title="Syncing" message="Fetching the latest forecast…" />
        )}
        {!cache && weather.state === "denied" && (
          <PermissionCard
            title="Location denied"
            explanation="Location permission was declined. You can still get a forecast by searching for a city."
            actionLabel="Search for a city"
            onAction={() => setSearchOpen(true)}
          />
        )}
        {!cache && weather.state === "error" && (
          <ErrorState
            message={weather.error ?? "The weather service could not be reached."}
            retry={() => void weather.refresh()}
          />
        )}

        {(searchOpen || (!cache && weather.state === "denied")) && (
          <CitySearch
            onSelect={(place) => {
              setSearchOpen(false);
              void weather.setLocation(place);
            }}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {cache && condition && (
          <>
            {/* Big glyph */}
            <motion.div
              key={condition.kind}
              className="flex justify-center py-8 text-ink"
              initial={reduced ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <WeatherGlyph kind={condition.kind} size={230} label={condition.label} />
            </motion.div>

            {/* Stat circles — droplet / wind / feels-like, comp style */}
            <div className="grid grid-cols-3 gap-2 py-4">
              <StatCircle
                icon={<Droplet size={20} strokeWidth={1.6} aria-hidden />}
                value={`${Math.round(cache.data.current.precipitationProbability)}%`}
                label="Precipitation"
              />
              <StatCircle
                icon={<Wind size={20} strokeWidth={1.6} aria-hidden />}
                value={`${Math.round(convertWind(cache.data.current.windSpeed, prefs.windUnit).value)}${convertWind(0, prefs.windUnit).label}`}
                label={`Wind ${cardinalFromDegrees(cache.data.current.windDirection)}`}
              />
              <StatCircle
                icon={<Thermometer size={20} strokeWidth={1.6} aria-hidden />}
                value={`${Math.round(convertTemp(cache.data.current.apparentTemperature, prefs.tempUnit))}°${prefs.tempUnit === "fahrenheit" ? "F" : "C"}`}
                label="Feels like"
              />
            </div>

            <HourlyCurve hours={cache.data.hourly} unit={prefs.tempUnit} reduced={Boolean(reduced)} />

            {/* Next days — flat rows */}
            <section className="pt-6">
              <h2 className="type-label pb-2">Next days</h2>
              {cache.data.daily.slice(1).map((d) => {
                const c = conditionFromCode(d.weatherCode);
                return (
                  <div
                    key={d.date}
                    className="flex items-center justify-between gap-3 py-3 hairline-b last:border-b-0"
                  >
                    <span className="w-12 text-sm font-bold">
                      {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(d.date))}
                    </span>
                    <WeatherGlyph kind={c.kind} size={32} className="text-ink" label={c.label} />
                    <span className="type-meta flex-1 text-right">
                      {Math.round(d.precipitationProbability)}%
                    </span>
                    <span className="type-display w-24 text-right text-sm">
                      {tempLabel(d.tempMin, prefs.tempUnit)} / {tempLabel(d.tempMax, prefs.tempUnit)}
                    </span>
                  </div>
                );
              })}
            </section>

            <p className="type-meta pt-4 text-center">
              Updated {formatRelative(cache.fetchedAt)} · {weatherProvider.name}
            </p>
          </>
        )}
      </div>
    </ToolScreen>
    </TintablePage>
  );
}

function StatCircle({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full border text-ink"
        style={{ borderColor: "var(--line-strong)" }}
      >
        {icon}
      </span>
      <span className="text-sm font-bold tnum">{value}</span>
      <span className="type-label text-[9px]">{label}</span>
    </div>
  );
}

/** Smooth temperature curve with a NOW pin — past hours as times, future as temps. */
function HourlyCurve({
  hours,
  unit,
  reduced,
}: {
  hours: Array<{ time: number; temperature: number }>;
  unit: TempUnit;
  reduced: boolean;
}) {
  if (hours.length < 3) return null;
  const w = 360;
  const h = 110;
  const pad = 8;
  const graphH = 78;

  const now = Date.now();
  const nowIdx = Math.max(0, hours.findIndex((x) => x.time >= now));
  const temps = hours.map((x) => convertTemp(x.temperature, unit));
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = Math.max(1, max - min);
  const pts = temps.map((t, i) => ({
    x: pad + (i / (hours.length - 1)) * (w - pad * 2),
    y: 14 + (1 - (t - min) / range) * (graphH - 24),
  }));

  // smooth curve through midpoints
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i]!.x + pts[i + 1]!.x) / 2;
    const my = (pts[i]!.y + pts[i + 1]!.y) / 2;
    d += ` Q${pts[i]!.x},${pts[i]!.y} ${mx},${my}`;
  }
  d += ` L${pts[pts.length - 1]!.x},${pts[pts.length - 1]!.y}`;

  const pin = pts[nowIdx]!;
  // label slots: a few past times, NOW, a few future temps
  const labelIdxs = [nowIdx - 4, nowIdx - 2, nowIdx, nowIdx + 4, nowIdx + 8, nowIdx + 12].filter(
    (i) => i >= 0 && i < hours.length,
  );

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label={`Temperature from ${Math.round(min)} to ${Math.round(max)} degrees over the next hours`}
    >
      <motion.path
        d={d}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
      {/* NOW pin */}
      <line x1={pin.x} x2={pin.x} y1={pin.y} y2={graphH + 8} stroke="var(--ink)" strokeWidth={1.6} />
      <circle cx={pin.x} cy={pin.y - 4} r={5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
      {labelIdxs.map((i) => {
        const isNow = i === nowIdx;
        const past = i < nowIdx;
        const label = isNow
          ? "NOW"
          : past
            ? new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(new Date(hours[i]!.time))
            : `${Math.round(temps[i]!)}°`;
        return (
          <text
            key={i}
            x={pts[i]!.x}
            y={h - 4}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={isNow ? "var(--ink)" : "var(--ink-muted)"}
            fontFamily="var(--font-sans)"
            letterSpacing="0.05em"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function CitySearch({
  onSelect,
  onClose,
}: {
  onSelect: (place: GeocodeResult) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await weatherProvider.searchCity(query.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 py-3" aria-label="City search">
      <div className="flex items-center gap-2 hairline-b pb-1">
        <Search size={16} aria-hidden className="text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void search()}
          placeholder="City name…"
          aria-label="City name"
          className="min-h-[44px] flex-1 bg-transparent text-sm outline-none"
          autoFocus
        />
      </div>
      {searching && <p className="type-meta">Searching…</p>}
      {error && <p className="text-sm" style={{ color: "var(--alert)" }}>{error}</p>}
      {results.map((r) => (
        <button
          key={`${r.latitude},${r.longitude}`}
          type="button"
          onClick={() => onSelect(r)}
          className="min-h-[44px] py-1 text-left text-sm hairline-b"
        >
          <span className="font-bold">{r.name}</span>
          <span className="ml-2 text-ink-muted">
            {[r.admin1, r.country].filter(Boolean).join(", ")}
          </span>
        </button>
      ))}
      <MechanicalButton variant="ghost" size="sm" onClick={onClose}>
        Close
      </MechanicalButton>
    </section>
  );
}
