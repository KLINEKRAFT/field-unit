"use client";

import { create } from "zustand";
import { stationRepo, uid } from "../db";
import type { RadioStation } from "../types";

export type StreamStatus = "idle" | "connecting" | "playing" | "error";

const DEFAULT_STATIONS: Array<Omit<RadioStation, "id" | "createdAt">> = [
  { name: "KEXP", streamUrl: "https://kexp.streamguys1.com/kexp128.mp3", band: "90.3" },
  { name: "Groove Salad", streamUrl: "https://ice1.somafm.com/groovesalad-128-mp3", band: "94.1" },
  { name: "Radio Paradise", streamUrl: "https://stream.radioparadise.com/mp3-128", band: "101.7" },
];

interface RadioStore {
  stations: RadioStation[];
  hydrated: boolean;
  activeId: string | null;
  status: StreamStatus;
  volume: number;
  muted: boolean;
  /** track title when the platform surfaces it (rare for plain streams) */
  nowPlaying: string | null;
  hydrate: () => Promise<void>;
  addStation: (name: string, streamUrl: string) => void;
  removeStation: (id: string) => void;
  play: (id: string) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
}

/* ------------------------- singleton audio element ---------------------- */

let audio: HTMLAudioElement | null = null;

function getAudio(store: () => RadioStore): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("playing", () => {
      useRadio.setState({ status: "playing" });
      updateMediaSession(store());
    });
    audio.addEventListener("waiting", () => useRadio.setState({ status: "connecting" }));
    audio.addEventListener("error", () => useRadio.setState({ status: "error" }));
    audio.addEventListener("pause", () => {
      if (useRadio.getState().status !== "error") useRadio.setState({ status: "idle" });
    });
  }
  return audio;
}

function updateMediaSession(state: RadioStore): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  const station = state.stations.find((s) => s.id === state.activeId);
  navigator.mediaSession.metadata = new MediaMetadata({
    title: station?.name ?? "Field Unit Radio",
    artist: state.nowPlaying ?? "Internet radio",
    album: "Field Unit",
  });
  navigator.mediaSession.setActionHandler("play", () => useRadio.getState().toggle());
  navigator.mediaSession.setActionHandler("pause", () => useRadio.getState().pause());
  navigator.mediaSession.setActionHandler("previoustrack", () => useRadio.getState().prev());
  navigator.mediaSession.setActionHandler("nexttrack", () => useRadio.getState().next());
}

/* --------------------------------- store -------------------------------- */

export const useRadio = create<RadioStore>((set, get) => ({
  stations: [],
  hydrated: false,
  activeId: null,
  status: "idle",
  volume: 0.8,
  muted: false,
  nowPlaying: null,

  hydrate: async () => {
    let stations = await stationRepo.list();
    if (stations.length === 0) {
      stations = DEFAULT_STATIONS.map((s, i) => ({
        ...s,
        id: uid(),
        createdAt: Date.now() + i,
      }));
      await Promise.all(stations.map((s) => stationRepo.save(s)));
    }
    stations.sort((a, b) => a.createdAt - b.createdAt);
    set({ stations, hydrated: true, activeId: get().activeId ?? stations[0]?.id ?? null });
  },

  addStation: (name, streamUrl) => {
    const station: RadioStation = { id: uid(), name, streamUrl, createdAt: Date.now() };
    set({ stations: [...get().stations, station] });
    void stationRepo.save(station);
  },

  removeStation: (id) => {
    const { activeId, stations } = get();
    if (activeId === id) get().pause();
    set({ stations: stations.filter((s) => s.id !== id) });
    void stationRepo.delete(id);
  },

  play: (id) => {
    const station = get().stations.find((s) => s.id === id);
    if (!station) return;
    const el = getAudio(get);
    el.src = station.streamUrl;
    el.volume = get().muted ? 0 : get().volume;
    set({ activeId: id, status: "connecting", nowPlaying: null });
    el.play().catch(() => set({ status: "error" }));
  },

  pause: () => {
    getAudio(get).pause();
    set({ status: "idle" });
  },

  toggle: () => {
    const { status, activeId, stations } = get();
    if (status === "playing" || status === "connecting") {
      get().pause();
    } else {
      const id = activeId ?? stations[0]?.id;
      if (id) get().play(id);
    }
  },

  next: () => {
    const { stations, activeId } = get();
    if (stations.length === 0) return;
    const i = stations.findIndex((s) => s.id === activeId);
    const nextStation = stations[(i + 1) % stations.length];
    if (nextStation) get().play(nextStation.id);
  },

  prev: () => {
    const { stations, activeId } = get();
    if (stations.length === 0) return;
    const i = stations.findIndex((s) => s.id === activeId);
    const prevStation = stations[(i - 1 + stations.length) % stations.length];
    if (prevStation) get().play(prevStation.id);
  },

  setVolume: (v) => {
    set({ volume: v, muted: false });
    if (audio) audio.volume = v;
  },

  setMuted: (m) => {
    set({ muted: m });
    if (audio) audio.volume = m ? 0 : get().volume;
  },
}));
