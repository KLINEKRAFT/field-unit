/**
 * Weather glyphs — the user's own dot-matrix icon set (see weatherIconPaths).
 * Rendered with currentColor so they follow theme ink.
 */
import type { ConditionKind } from "@/lib/weather/provider";
import {
  WEATHER_ICON_PATHS,
  WEATHER_ICON_VIEWBOX,
  type WeatherIconKey,
} from "./weatherIconPaths";

const KIND_TO_ICON: Record<ConditionKind, WeatherIconKey> = {
  clear: "sun",
  partly: "partly",
  cloudy: "cloud",
  fog: "cloud",
  drizzle: "rain",
  rain: "rain",
  snow: "cloud",
  thunder: "storm",
};

interface WeatherGlyphProps {
  kind: ConditionKind;
  size?: number;
  className?: string;
  label?: string;
}

export function WeatherGlyph({ kind, size = 120, className, label }: WeatherGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={WEATHER_ICON_VIEWBOX}
      role="img"
      aria-label={label ?? kind}
      className={className}
    >
      <path d={WEATHER_ICON_PATHS[KIND_TO_ICON[kind]]} fill="currentColor" />
    </svg>
  );
}

/** Direct access by icon name (e.g. the wind glyph on the weather page). */
export function WeatherIcon({
  icon,
  size = 24,
  className,
  label,
}: {
  icon: WeatherIconKey;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={WEATHER_ICON_VIEWBOX}
      role="img"
      aria-label={label ?? icon}
      className={className}
    >
      <path d={WEATHER_ICON_PATHS[icon]} fill="currentColor" />
    </svg>
  );
}
