import type { WeatherData } from "../types";
import type { GeocodeResult, WeatherProvider } from "./provider";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  };
}

interface GeocodeResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }>;
}

export const openMeteoProvider: WeatherProvider = {
  name: "Open-Meteo",

  async fetchWeather(latitude: number, longitude: number): Promise<WeatherData> {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      // NB: precipitation_probability is hourly-only in the Open-Meteo API
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      daily: "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code",
      forecast_days: "6",
      timezone: "auto",
      wind_speed_unit: "kmh",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Weather service error (${res.status})`);
    const json = (await res.json()) as OpenMeteoResponse;

    const now = Date.now();
    const hourly = json.hourly.time
      .map((t, i) => ({
        time: new Date(t).getTime(),
        temperature: json.hourly.temperature_2m[i] ?? 0,
        precipitationProbability: json.hourly.precipitation_probability[i] ?? 0,
        weatherCode: json.hourly.weather_code[i] ?? 0,
      }))
      .filter((h) => h.time >= now - 30 * 60 * 1000)
      .slice(0, 24);

    return {
      current: {
        temperature: json.current.temperature_2m,
        apparentTemperature: json.current.apparent_temperature,
        humidity: json.current.relative_humidity_2m,
        windSpeed: json.current.wind_speed_10m,
        windDirection: json.current.wind_direction_10m,
        // current-hour probability comes from the hourly series
        precipitationProbability: hourly[0]?.precipitationProbability ?? 0,
        weatherCode: json.current.weather_code,
        isDay: json.current.is_day === 1,
      },
      hourly,
      daily: json.daily.time.slice(0, 6).map((t, i) => ({
        date: new Date(`${t}T12:00:00`).getTime(),
        tempMin: json.daily.temperature_2m_min[i] ?? 0,
        tempMax: json.daily.temperature_2m_max[i] ?? 0,
        precipitationProbability: json.daily.precipitation_probability_max[i] ?? 0,
        weatherCode: json.daily.weather_code[i] ?? 0,
      })),
    };
  },

  async searchCity(query: string): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({ name: query, count: "6", language: "en" });
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!res.ok) throw new Error(`Geocoding error (${res.status})`);
    const json = (await res.json()) as GeocodeResponse;
    return (json.results ?? []).map((r) => ({
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      admin1: r.admin1,
    }));
  },
};

/** The active provider. Swap the implementation here to change services. */
export const weatherProvider: WeatherProvider = openMeteoProvider;
