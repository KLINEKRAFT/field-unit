"use client";

import { useState } from "react";
import { ToolScreen } from "@/components/ToolScreen";
import { TintablePage } from "@/components/TintablePage";
import { MechanicalButton, SpeakerPattern } from "@/components/controls";
import { Waveform } from "@/components/Waveform";
import { useRadio } from "@/lib/stores/radio";
import { playTick } from "@/lib/sound";
import { motion, useReducedMotion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Plus, Trash2 } from "lucide-react";

export default function RadioPage() {
  const radio = useRadio();
  const [managing, setManaging] = useState(false);
  const reduced = useReducedMotion();

  const active = radio.stations.find((s) => s.id === radio.activeId);
  const playing = radio.status === "playing";

  return (
    <TintablePage page="radio">
    <ToolScreen
      title="Radio"
      mode={
        playing
          ? "ON AIR"
          : radio.status === "connecting"
            ? "TUNING"
            : radio.status === "error"
              ? "FAULT"
              : "STANDBY"
      }
      lightOn={playing || radio.status === "connecting"}
      lightColor={radio.status === "error" ? "alert" : "accent"}
    >
      <div className="mx-auto flex max-w-md flex-col gap-6">
        {/* Frequency display */}
        <section className="flex flex-col items-center gap-1 pt-2 text-center">
          <p className="type-display text-[76px]" aria-label={`Frequency ${active?.band ?? "none"}`}>
            {active?.band ?? "——"}
            <span className="ml-2 align-middle text-base font-bold">MHz</span>
          </p>
          <p className="text-lg font-bold uppercase tracking-[0.08em]">
            {active?.name ?? "No station"}
          </p>
          <p className="type-label" role="status">
            {radio.status === "error"
              ? "No signal — try another preset"
              : playing
                ? "Stereo · Live stream"
                : radio.status === "connecting"
                  ? "Tuning…"
                  : "Standby"}
          </p>
        </section>

        {/* Speaker field / live waveform. The waveform is the real signal from
            the stream (WebAudio); stations that block CORS analysis keep the
            static speaker pattern instead — never a fake wave. */}
        {playing && radio.analyser ? (
          <div className="px-1">
            <Waveform analyser={radio.analyser} height={150} />
          </div>
        ) : (
          <motion.div
            className="flex justify-center text-ink"
            animate={playing && !reduced ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.85 }}
            transition={{ repeat: playing ? Infinity : 0, duration: 1.8, ease: "easeInOut" }}
          >
            <SpeakerPattern rows={11} cols={11} dotSize={13} gap={11} />
          </motion.div>
        )}

        {/* Tuning scale */}
        <TuningScale band={active?.band} reduced={Boolean(reduced)} />

        {/* Transport */}
        <div className="flex items-center justify-center gap-5">
          <RoundButton label="Previous preset" onClick={radio.prev}>
            <SkipBack size={18} aria-hidden />
          </RoundButton>
          <RoundButton label={playing ? "Pause" : "Play"} onClick={radio.toggle} size={76} primary>
            {playing ? <Pause size={26} aria-hidden /> : <Play size={26} aria-hidden className="ml-1" />}
          </RoundButton>
          <RoundButton label="Next preset" onClick={radio.next}>
            <SkipForward size={18} aria-hidden />
          </RoundButton>
        </div>

        {/* Presets */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="type-label">Presets</h2>
            <MechanicalButton size="sm" variant="ghost" onClick={() => setManaging(!managing)}>
              {managing ? "Done" : "Edit"}
            </MechanicalButton>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {radio.stations.map((s, i) => {
              const isActive = s.id === radio.activeId;
              return (
                <div key={s.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      playTick();
                      radio.play(s.id);
                    }}
                    aria-pressed={isActive}
                    className={`flex min-h-[76px] w-full flex-col justify-between rounded-[16px] border p-3 text-left transition-colors duration-150 ${
                      isActive ? "border-transparent bg-ink" : "border-line bg-panel"
                    }`}
                  >
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: isActive ? "var(--hot, #ed3f1c)" : "var(--ink-muted)" }}
                    >
                      {isActive && playing ? "Live" : `Preset ${String(i + 1).padStart(2, "0")}`}
                    </span>
                    <span
                      className="type-display truncate text-xl"
                      style={{ color: isActive ? "var(--surface)" : "var(--ink)" }}
                    >
                      {s.band ?? s.name.slice(0, 6)}
                    </span>
                  </button>
                  {managing && (
                    <button
                      type="button"
                      aria-label={`Delete ${s.name}`}
                      onClick={() => radio.removeStation(s.id)}
                      className="absolute -right-1.5 -top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface"
                      style={{ color: "var(--alert)" }}
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {managing && <AddStationForm onAdd={radio.addStation} />}
        </section>

        <p className="type-meta px-2 pb-2 text-center">
          Playback continues while you use other instruments. iOS may pause audio when the app is
          backgrounded for a long time.
        </p>
      </div>
    </ToolScreen>
    </TintablePage>
  );
}

function RoundButton({
  children,
  label,
  onClick,
  size = 56,
  primary = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  size?: number;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        playTick();
        onClick();
      }}
      className="flex items-center justify-center rounded-full border transition-transform duration-150 active:scale-95"
      style={{
        width: size,
        height: size,
        borderColor: "var(--line-strong)",
        borderWidth: primary ? 2 : 1,
        background: "transparent",
        color: "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

const SCALE_MIN = 88;
const SCALE_MAX = 108;

function TuningScale({ band, reduced }: { band?: string; reduced: boolean }) {
  const w = 340;
  const h = 52;
  const pad = 12;
  const freq = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Number(band) || SCALE_MIN));
  const x = pad + ((freq - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * (w - pad * 2);
  const stops = [88, 92, 96, 100, 104, 108];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label={`Tuned to ${band ?? "nothing"} megahertz`}
    >
      {Array.from({ length: 41 }, (_, i) => {
        const tx = pad + (i / 40) * (w - pad * 2);
        const major = i % 8 === 0;
        return (
          <circle key={i} cx={tx} cy={20} r={major ? 2.4 : 1.4} fill="var(--ink)" opacity={major ? 0.9 : 0.35} />
        );
      })}
      {stops.map((f) => (
        <text
          key={f}
          x={pad + ((f - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * (w - pad * 2)}
          y={h - 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--ink-muted)"
          fontFamily="var(--font-sans)"
        >
          {f}
        </text>
      ))}
      {/* needle: circle head + stem, like the comp */}
      <motion.g
        animate={{ x: x - pad }}
        initial={false}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 24 }}
      >
        <line x1={pad} x2={pad} y1={10} y2={30} stroke="var(--hot, #ed3f1c)" strokeWidth={2} />
        <circle cx={pad} cy={7} r={4.5} fill="none" stroke="var(--hot, #ed3f1c)" strokeWidth={2} />
      </motion.g>
    </svg>
  );
}

function AddStationForm({ onAdd }: { onAdd: (name: string, url: string) => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const valid = name.trim().length > 0 && /^https:\/\/.+/.test(url.trim());

  return (
    <form
      className="panel-inset flex flex-col gap-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd(name.trim(), url.trim());
        setName("");
        setUrl("");
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Station name"
        aria-label="Station name"
        className="min-h-[44px] rounded-[12px] border border-line bg-surface px-3 text-sm outline-none"
      />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://stream.example.com/live"
        aria-label="Stream URL"
        className="min-h-[44px] rounded-[12px] border border-line bg-surface px-3 text-sm outline-none"
      />
      <MechanicalButton size="sm" disabled={!valid} htmlType="submit">
        <Plus size={16} aria-hidden /> Add station
      </MechanicalButton>
    </form>
  );
}
