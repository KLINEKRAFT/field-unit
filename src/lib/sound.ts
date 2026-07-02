/**
 * Bundled, browser-safe alert sounds synthesized with WebAudio.
 * No audio files shipped; everything works offline.
 */
import type { AlarmSoundId } from "./types";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  gainPeak = 0.24,
  type: OscillatorType = "square",
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const ALARM_SOUNDS: Array<{ id: AlarmSoundId; label: string }> = [
  { id: "pulse", label: "Pulse" },
  { id: "chime", label: "Chime" },
  { id: "ramp", label: "Ramp" },
];

/** Plays one ~1s cycle of the given alarm sound. Callers loop it. */
export function playAlarmCycle(id: AlarmSoundId): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  switch (id) {
    case "pulse":
      tone(ac, 880, t, 0.09);
      tone(ac, 880, t + 0.14, 0.09);
      tone(ac, 880, t + 0.28, 0.09);
      break;
    case "chime":
      tone(ac, 659.25, t, 0.4, 0.18, "sine");
      tone(ac, 987.77, t + 0.18, 0.5, 0.14, "sine");
      break;
    case "ramp":
      tone(ac, 440, t, 0.1);
      tone(ac, 554, t + 0.12, 0.1);
      tone(ac, 659, t + 0.24, 0.1);
      tone(ac, 880, t + 0.36, 0.16);
      break;
  }
}

/** Short confirmation tick for mechanical interactions. */
export function playTick(): void {
  const ac = getCtx();
  if (!ac) return;
  tone(ac, 1320, ac.currentTime, 0.03, 0.06, "square");
}

/** Timer-complete signal: three ascending pings. */
export function playTimerDone(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 660, t, 0.12, 0.2, "sine");
  tone(ac, 880, t + 0.16, 0.12, 0.2, "sine");
  tone(ac, 1100, t + 0.32, 0.22, 0.22, "sine");
}
