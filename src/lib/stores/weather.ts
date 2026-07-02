"use client";

import { create } from "zustand";
import { weatherCacheRepo } from "../db";
import type { WeatherCache } from "../types";
import { weatherProvider } from "../weather/openMeteo";
import type { GeocodeResult } from "../weather/provider";

export type WeatherUIState = "idle" | "loading" | "ready" | "denied" | "error";

interface WeatherStore {
  cache: WeatherCache | null;
  state: WeatherUIState;
  error: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  /** refresh only when the cache is older than `maxAgeMs`; called on page view */
  refreshIfStale: (maxAgeMs: number) => Promise<void>;
  useMyLocation: () => Promise<void>;
  setLocation: (place: GeocodeResult) => Promise<void>;
}

async function fetchAndCache(
  latitude: number,
  longitude: number,
  locationName: string,
): Promise<WeatherCache> {
  const data = await weatherProvider.fetchWeather(latitude, longitude);
  const cache: WeatherCache = { latitude, longitude, locationName, fetchedAt: Date.now(), data };
  await weatherCacheRepo.set(cache);
  return cache;
}

export const useWeather = create<WeatherStore>((set, get) => ({
  cache: null,
  state: "idle",
  error: null,
  hydrated: false,

  hydrate: async () => {
    const cache = await weatherCacheRepo.get();
    set({ cache, hydrated: true, state: cache ? "ready" : "idle" });
    if (cache) {
      // Silently refresh cached data older than 10 min. Open-Meteo's current
      // condition can spike momentarily (e.g. a brief storm code), so we never
      // want to sit on a stale reading for long.
      if (Date.now() - cache.fetchedAt > 10 * 60 * 1000) void get().refresh();
      return;
    }
    // First run: default to the home station — Tulsa, OK. City-based, so no
    // permission prompt; "use my location" remains available on the dial.
    try {
      set({ state: "loading" });
      const tulsa = await fetchAndCache(36.154, -95.9928, "Tulsa, OK");
      set({ cache: tulsa, state: "ready" });
    } catch {
      set({ state: "idle" });
    }
  },

  refresh: async () => {
    const { cache } = get();
    if (!cache) return;
    try {
      set({ state: "loading", error: null });
      const next = await fetchAndCache(cache.latitude, cache.longitude, cache.locationName);
      set({ cache: next, state: "ready" });
    } catch (e) {
      set({ state: get().cache ? "ready" : "error", error: (e as Error).message });
    }
  },

  refreshIfStale: async (maxAgeMs) => {
    const { cache, state } = get();
    if (!cache || state === "loading") return;
    if (Date.now() - cache.fetchedAt > maxAgeMs) await get().refresh();
  },

  useMyLocation: async () => {
    set({ state: "loading", error: null });
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 15000,
          maximumAge: 5 * 60 * 1000,
        }),
      );
      const { latitude, longitude } = pos.coords;
      const cache = await fetchAndCache(latitude, longitude, "Current location");
      set({ cache, state: "ready" });
    } catch (e) {
      const err = e as GeolocationPositionError | Error;
      if ("code" in err && err.code === err.PERMISSION_DENIED) {
        set({ state: get().cache ? "ready" : "denied", error: "Location permission denied" });
      } else {
        set({ state: get().cache ? "ready" : "error", error: err.message });
      }
    }
  },

  setLocation: async (place) => {
    set({ state: "loading", error: null });
    try {
      const cache = await fetchAndCache(place.latitude, place.longitude, place.name);
      set({ cache, state: "ready" });
    } catch (e) {
      set({ state: get().cache ? "ready" : "error", error: (e as Error).message });
    }
  },
}));
