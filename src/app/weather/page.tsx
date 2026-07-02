"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ToolScreen } from "@/components/ToolScreen";
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
import { RefreshCw, Search } from "lucide-react";

export default function WeatherPage() {
  const weather = useWeather();
  const prefs = usePrefs((s) => s.prefs);
  const [searchOpen, setSearchOpen] = useState(false);
  const reduced = useReducedMotion();

  const cache = weather.cache;
  const condition = cache ? conditionFromCode(cache.data.current.weatherCode) : null;

  return (
    <ToolScreen
      title="Weather"
      mode={weather.state === "loading" ? "SYNC" : cache ? "LIVE" : "STANDBY"}
      lightOn={Boolean(cache)}
      lightColor="sage"
      actions={
        cache ? (
          <button
            type="button"
            aria-label="Refresh weather"
            onClick={() => void weather.refresh()}
            className="control flex h-11 w-11 items-center justify-center"
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
      <div className="mx-auto flex max-w-md flex-col gap-5">
        {!cache && weather.state === "idle" && (
          <PermissionCard
            title="Location"
            explanation="Weather needs a place to report on. Use your current position (asks for browser location permission) or search for a city. Your position is only sent to the weather service to fetch the forecast."
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
            retry={() => void weather.useMyLocation()}
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
            <section className="panel flex flex-col items-center gap-3 px-4 py-8">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="type-label underline-offset-4 hover:underline"
                aria-label={`Change location, currently ${cache.locationName}`}
              >
                {cache.locationName} ▾
              </button>
              <motion.div
                key={condition.kind}
                initial={reduced ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <WeatherGlyph
                  kind={condition.kind}
                  size={190}
                  className="text-ink"
                  label={condition.label}
                />
              </motion.div>
              <div className="text-center">
                <p className="type-display text-[84px]">
                  {tempLabel(cache.data.current.temperature, prefs.tempUnit)}
                </p>
                <p className="type-label mt-2">
                  {condition.label} · Feels{" "}
                  {tempLabel(cache.data.current.apparentTemperature, prefs.tempUnit)}
                </p>
              </div>

              {/* Stat band */}
              <div className="mt-3 grid w-full grid-cols-3 border-t border-line pt-4">
                <Stat
                  value={`${Math.round(cache.data.current.precipitationProbability)}%`}
                  label="Precip"
                />
                <Stat
                  value={`${Math.round(convertWind(cache.data.current.windSpeed, prefs.windUnit).value)}`}
                  label={`${convertWind(0, prefs.windUnit).label} ${cardinalFromDegrees(cache.data.current.windDirection)}`}
                />
                <Stat value={`${Math.round(cache.data.current.humidity)}%`} label="Humidity" />
              </div>
            </section>

            <HourlyGraph cache={cache.data.hourly} unit={prefs.tempUnit} />

            <section className="flex flex-col gap-1">
              <h2 className="type-label pb-1">Next days</h2>
              <div className="panel-inset px-4 py-1">
                {cache.data.daily.slice(1).map((d) => {
                  const c = conditionFromCode(d.weatherCode);
                  return (
                    <div
                      key={d.date}
                      className="flex items-center justify-between gap-3 py-2.5 hairline-b last:border-b-0"
                    >
                      <span className="w-12 text-sm font-semibold">
                        {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(d.date))}
                      </span>
                      <WeatherGlyph kind={c.kind} size={30} className="text-ink" label={c.label} />
                      <span className="type-meta flex-1 text-right">
                        {Math.round(d.precipitationProbability)}%
                      </span>
                      <span className="type-measure w-24 text-right text-sm">
                        {tempLabel(d.tempMin, prefs.tempUnit)} / {tempLabel(d.tempMax, prefs.tempUnit)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <p className="type-meta text-center">
              Updated {formatRelative(cache.fetchedAt)} · {weatherProvider.name}
            </p>
          </>
        )}
      </div>
    </ToolScreen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="type-display text-xl">{value}</span>
      <span className="type-label text-[9px]">{label}</span>
    </div>
  );
}

function HourlyGraph({
  cache,
  unit,
}: {
  cache: Array<{ time: number; temperature: number; precipitationProbability: number }>;
  unit: "celsius" | "fahrenheit";
}) {
  const reducedGraph = useReducedMotion();
  const hours = cache.slice(0, 24);
  if (hours.length < 2) return null;

  const w = 360;
  const h = 96;
  const pad = 10;
  const temps = hours.map((x) => convertTemp(x.temperature, unit));
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = Math.max(1, max - min);
  const pts = temps.map((t, i) => ({
    x: pad + (i / (hours.length - 1)) * (w - pad * 2),
    y: h - pad - ((t - min) / range) * (h - pad * 2),
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <section className="flex flex-col gap-1">
      <h2 className="type-label pb-1">Next 24 hours</h2>
      <div className="panel-inset p-4">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full"
          role="img"
          aria-label={`Hourly temperature from ${Math.round(min)} to ${Math.round(max)} degrees`}
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={pad}
              x2={w - pad}
              y1={h * f}
              y2={h * f}
              stroke="var(--line)"
              strokeDasharray="2 4"
            />
          ))}
          <motion.path
            d={path}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinejoin="round"
            initial={reducedGraph ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
          {pts.filter((_, i) => i % 4 === 0).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--accent)" stroke="var(--ink)" />
          ))}
        </svg>
        <div className="mt-2 flex justify-between">
          {hours
            .filter((_, i) => i % 6 === 0)
            .map((x) => (
              <span key={x.time} className="type-meta">
                {new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(new Date(x.time))}
              </span>
            ))}
        </div>
      </div>
    </section>
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
    <section className="panel flex flex-col gap-3 p-4" aria-label="City search">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void search()}
          placeholder="City name…"
          aria-label="City name"
          className="min-h-[44px] flex-1 rounded-[12px] border border-line bg-surface px-3 text-sm outline-none"
        />
        <MechanicalButton size="sm" onClick={() => void search()} ariaLabel="Search">
          <Search size={16} aria-hidden />
        </MechanicalButton>
      </div>
      {searching && <p className="type-meta">Searching…</p>}
      {error && <p className="text-sm" style={{ color: "var(--alert)" }}>{error}</p>}
      {results.map((r) => (
        <button
          key={`${r.latitude},${r.longitude}`}
          type="button"
          onClick={() => onSelect(r)}
          className="control min-h-[48px] px-3 text-left text-sm"
        >
          <span className="font-semibold">{r.name}</span>
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
