import type { WeatherData } from "../types";

export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/**
 * Weather provider abstraction. The UI depends only on this interface,
 * so Open-Meteo can be swapped for another service later.
 */
export interface WeatherProvider {
  readonly name: string;
  fetchWeather(latitude: number, longitude: number): Promise<WeatherData>;
  searchCity(query: string): Promise<GeocodeResult[]>;
}

/** Maps WMO weather codes to a compact condition vocabulary used by the UI. */
export type ConditionKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

export function conditionFromCode(code: number): { kind: ConditionKind; label: string } {
  if (code === 0) return { kind: "clear", label: "Clear" };
  if (code === 1) return { kind: "clear", label: "Mostly clear" };
  if (code === 2) return { kind: "partly", label: "Partly cloudy" };
  if (code === 3) return { kind: "cloudy", label: "Overcast" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Fog" };
  if (code >= 51 && code <= 57) return { kind: "drizzle", label: "Drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { kind: "rain", label: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { kind: "snow", label: "Snow" };
  if (code >= 95) return { kind: "thunder", label: "Thunderstorm" };
  return { kind: "cloudy", label: "Cloudy" };
}
