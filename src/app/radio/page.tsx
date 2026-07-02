"use client";

import { useState } from "react";
import { ToolScreen } from "@/components/ToolScreen";
import { MechanicalButton, SpeakerPattern } from "@/components/controls";
import { DotMatrixDisplay } from "@/components/DotMatrixDisplay";
import { RotaryDial } from "@/components/RotaryDial";
import { useRadio } from "@/lib/stores/radio";
import { motion, useReducedMotion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, VolumeX, Volume2, Plus, Trash2 } from "lucide-react";

export default function RadioPage() {
  const radio = useRadio();
  const [managing, setManaging] = useState(false);
  const reduced = useReducedMotion();

  const active = radio.stations.find((s) => s.id === radio.activeId);
  const activeIndex = radio.stations.findIndex((s) => s.id === radio.activeId);
  const playing = radio.status === "playing";

  return (
    <ToolScreen
      title="Radio"
      mode={playing ? "ON AIR" : radio.status === "connecting" ? "TUNING" : radio.status === "error" ? "FAULT" : "STANDBY"}
      lightOn={playing || radio.status === "connecting"}
      lightColor={radio.status === "error" ? "alert" : "accent"}
    >
      <div className="mx-auto flex max-w-md flex-col gap-5">
        {/* Frequency-style display */}
        <section className="panel flex flex-col gap-5 p-5">
          <div className="panel-inset flex flex-col gap-3 p-4">
            <div className="flex items-baseline justify-between">
              <span className="type-measure segments text-5xl">{active?.band ?? "--.-"}</span>
              <span className="type-label">{playing ? "Stereo" : radio.status === "error" ? "No signal" : "Muted air"}</span>
            </div>
            <div className="text-ink">
              <DotMatrixDisplay
                text={(active?.name ?? "No station").slice(0, 14)}
                dotSize={3.4}
                gap={1.6}
                showGrid
                fluid
                label={`Station: ${active?.name ?? "none"}`}
              />
            </div>
            <p className="type-meta" role="status">
              {radio.status === "error"
                ? "Stream failed — check the URL or try another preset."
                : radio.nowPlaying ?? (playing ? "Live stream" : "Press play to tune in")}
            </p>
          </div>

          {/* Tuning scale */}
          <TuningScale count={radio.stations.length} activeIndex={activeIndex} reduced={Boolean(reduced)} />

          {/* Transport */}
          <div className="flex items-center justify-center gap-3">
            <MechanicalButton ariaLabel="Previous preset" onClick={radio.prev} className="h-14 w-14">
              <SkipBack size={18} aria-hidden />
            </MechanicalButton>
            <MechanicalButton
              ariaLabel={playing ? "Pause" : "Play"}
              variant="primary"
              onClick={radio.toggle}
              className="h-[72px] w-[72px] rounded-full"
            >
              {playing ? <Pause size={26} aria-hidden /> : <Play size={26} aria-hidden className="ml-1" />}
            </MechanicalButton>
            <MechanicalButton ariaLabel="Next preset" onClick={radio.next} className="h-14 w-14">
              <SkipForward size={18} aria-hidden />
            </MechanicalButton>
          </div>

          {/* Volume + speaker */}
          <div className="flex items-center justify-between px-2">
            <RotaryDial value={radio.volume} onChange={radio.setVolume} label="Volume" size={92} />
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={playing && !reduced ? { opacity: [0.55, 0.9, 0.55] } : { opacity: 0.55 }}
                transition={{ repeat: playing ? Infinity : 0, duration: 1.6 }}
                className="text-ink"
              >
                <SpeakerPattern rows={9} cols={9} dotSize={4} gap={5} />
              </motion.div>
              <MechanicalButton
                size="sm"
                ariaLabel={radio.muted ? "Unmute" : "Mute"}
                active={radio.muted}
                onClick={() => radio.setMuted(!radio.muted)}
              >
                {radio.muted ? <VolumeX size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
                {radio.muted ? "Muted" : "Mute"}
              </MechanicalButton>
            </div>
          </div>
        </section>

        {/* Presets */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="type-label">Presets</h2>
            <MechanicalButton size="sm" variant="ghost" onClick={() => setManaging(!managing)}>
              {managing ? "Done" : "Edit"}
            </MechanicalButton>
          </div>
          {radio.stations.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => radio.play(s.id)}
                aria-pressed={s.id === radio.activeId}
                className={`control flex min-h-[52px] flex-1 items-center justify-between px-4 text-sm ${
                  s.id === radio.activeId ? "bg-accent text-accent-ink" : ""
                }`}
              >
                <span className="font-semibold">{s.name}</span>
                <span className="segments text-xs opacity-70">P{i + 1}</span>
              </button>
              {managing && (
                <button
                  type="button"
                  aria-label={`Delete ${s.name}`}
                  onClick={() => radio.removeStation(s.id)}
                  className="control flex h-[52px] w-[52px] items-center justify-center"
                  style={{ color: "var(--alert)" }}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              )}
            </div>
          ))}
          {managing && <AddStationForm onAdd={radio.addStation} />}
        </section>

        <p className="type-meta px-2 text-center">
          Playback continues while you use other instruments. iOS may pause audio when the app is
          backgrounded for a long time.
        </p>
      </div>
    </ToolScreen>
  );
}

function TuningScale({
  count,
  activeIndex,
  reduced,
}: {
  count: number;
  activeIndex: number;
  reduced: boolean;
}) {
  const w = 320;
  const h = 40;
  const pad = 14;
  const x =
    count > 1 && activeIndex >= 0 ? pad + (activeIndex / (count - 1)) * (w - pad * 2) : w / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Preset ${activeIndex + 1} of ${count}`}>
      {Array.from({ length: 33 }, (_, i) => {
        const tx = pad + (i / 32) * (w - pad * 2);
        const major = i % 4 === 0;
        return (
          <line
            key={i}
            x1={tx}
            x2={tx}
            y1={h - 8}
            y2={h - 8 - (major ? 16 : 9)}
            stroke="var(--ink)"
            strokeWidth={major ? 1.6 : 0.8}
            opacity={major ? 0.8 : 0.35}
          />
        );
      })}
      <motion.line
        x1={x}
        x2={x}
        y1={4}
        y2={h - 4}
        stroke="var(--alert)"
        strokeWidth={2.4}
        animate={{ x1: x, x2: x }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
      />
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
