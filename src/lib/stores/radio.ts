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
  /**
   * Live analyser for the dot-matrix waveform. Only available when the
   * stream's server allows CORS audio analysis; otherwise playback continues
   * without visualization (never faked).
   */
  analyser: AnalyserNode | null;
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

/* --------------------------- audio infrastructure ------------------------ */
/*
 * Two elements: a CORS-enabled one wired into WebAudio (analyser), and a
 * plain fallback for streams that reject CORS — a MediaElementSource on
 * non-CORS media would output silence, so those get a clean element instead.
 */

let wiredEl: HTMLAudioElement | null = null;
let plainEl: HTMLAudioElement | null = null;
let currentEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
const noCorsUrls = new Set<string>();

function attachListeners(el: HTMLAudioElement, isWired: boolean): void {
  el.addEventListener("playing", () => {
    useRadio.setState({ status: "playing", analyser: isWired ? analyserNode : null });
    updateMediaSession();
  });
  el.addEventListener("waiting", () => useRadio.setState({ status: "connecting" }));
  el.addEventListener("pause", () => {
    if (useRadio.getState().status !== "error") useRadio.setState({ status: "idle" });
  });
  el.addEventListener("error", () => {
    const state = useRadio.getState();
    const station = state.stations.find((s) => s.id === state.activeId);
    if (isWired && station && !noCorsUrls.has(station.streamUrl)) {
      // Stream refused the CORS load — retry once on the plain element.
      noCorsUrls.add(station.streamUrl);
      startPlayback(station, false);
    } else {
      useRadio.setState({ status: "error", analyser: null });
    }
  });
}

function getWiredEl(): HTMLAudioElement {
  if (!wiredEl) {
    wiredEl = new Audio();
    wiredEl.preload = "none";
    wiredEl.crossOrigin = "anonymous";
    attachListeners(wiredEl, true);
  }
  return wiredEl;
}

function getPlainEl(): HTMLAudioElement {
  if (!plainEl) {
    plainEl = new Audio();
    plainEl.preload = "none";
    attachListeners(plainEl, false);
  }
  return plainEl;
}

/** Must be called from a user gesture (play tap) for iOS AudioContext rules. */
function ensureWebAudio(el: HTMLAudioElement): void {
  if (audioCtx) {
    void audioCtx.resume();
    return;
  }
  try {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    const source = audioCtx.createMediaElementSource(el);
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 1024;
    source.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
  } catch {
    audioCtx = null;
    analyserNode = null;
  }
}

function startPlayback(station: RadioStation, tryCors: boolean): void {
  const { volume, muted } = useRadio.getState();
  // stop whichever element was active
  currentEl?.pause();
  const el = tryCors ? getWiredEl() : getPlainEl();
  currentEl = el;
  if (tryCors) ensureWebAudio(el);
  el.src = station.streamUrl;
  el.volume = muted ? 0 : volume;
  useRadio.setState({
    activeId: station.id,
    status: "connecting",
    nowPlaying: null,
    analyser: null,
  });
  el.play().catch(() => {
    if (tryCors && !noCorsUrls.has(station.streamUrl)) {
      noCorsUrls.add(station.streamUrl);
      startPlayback(station, false);
    } else {
      useRadio.setState({ status: "error", analyser: null });
    }
  });
}

function updateMediaSession(): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  const state = useRadio.getState();
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

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/* --------------------------------- store -------------------------------- */

export const useRadio = create<RadioStore>((set, get) => ({
  stations: [],
  hydrated: false,
  activeId: null,
  status: "idle",
  volume: 0.8,
  muted: false,
  analyser: null,
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
    // Migration: devices that saved an older default list get KEXP inserted
    // as preset 01 — it is the house station.
    const kexpDefault = DEFAULT_STATIONS[0]!;
    let kexp = stations.find((s) => s.streamUrl === kexpDefault.streamUrl);
    if (!kexp) {
      const earliest = Math.min(...stations.map((s) => s.createdAt));
      kexp = { ...kexpDefault, id: uid(), createdAt: earliest - 1000 };
      stations.push(kexp);
      await stationRepo.save(kexp);
    } else if (stations.some((s) => s.createdAt < kexp!.createdAt)) {
      // ensure KEXP sorts first
      kexp.createdAt = Math.min(...stations.map((s) => s.createdAt)) - 1000;
      await stationRepo.save(kexp);
    }
    stations.sort((a, b) => a.createdAt - b.createdAt);
    set({ stations, hydrated: true, activeId: get().activeId ?? kexp.id });
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
    startPlayback(station, !noCorsUrls.has(station.streamUrl));
  },

  pause: () => {
    currentEl?.pause();
    set({ status: "idle", analyser: null });
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
    const station = stations[(i + 1) % stations.length];
    if (station) get().play(station.id);
  },

  prev: () => {
    const { stations, activeId } = get();
    if (stations.length === 0) return;
    const i = stations.findIndex((s) => s.id === activeId);
    const station = stations[(i - 1 + stations.length) % stations.length];
    if (station) get().play(station.id);
  },

  setVolume: (v) => {
    set({ volume: v, muted: false });
    if (currentEl) currentEl.volume = v;
  },

  setMuted: (m) => {
    set({ muted: m });
    if (currentEl) currentEl.volume = m ? 0 : get().volume;
  },
}));
