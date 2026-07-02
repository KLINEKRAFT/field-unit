"use client";

/**
 * A physical-feeling rotary control. Drag around the knob (or use arrow keys)
 * to change a continuous value. Used for radio volume.
 */
import { useCallback, useRef } from "react";
import { playTick } from "@/lib/sound";

interface RotaryDialProps {
  /** 0..1 */
  value: number;
  onChange: (value: number) => void;
  size?: number;
  label: string;
}

const START_ANGLE = -135;
const SWEEP = 270;

export function RotaryDial({ value, onChange, size = 96, label }: RotaryDialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastNotch = useRef(Math.round(value * 20));

  const setFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI - 90;
      const norm = ((angle + 360 + 135) % 360) / SWEEP;
      const clamped = Math.min(1, Math.max(0, norm > 1.15 ? 0 : norm));
      const notch = Math.round(clamped * 20);
      if (notch !== lastNotch.current) {
        lastNotch.current = notch;
        playTick();
      }
      onChange(clamped);
    },
    [onChange],
  );

  const angle = START_ANGLE + value * SWEEP;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={ref}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            onChange(Math.min(1, value + 0.05));
            e.preventDefault();
          }
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            onChange(Math.max(0, value - 0.05));
            e.preventDefault();
          }
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0) setFromPointer(e.clientX, e.clientY);
        }}
        className="relative touch-none select-none rounded-full border border-line-strong bg-panel"
        style={{
          width: size,
          height: size,
          boxShadow: "inset 0 1px 0 var(--inset-hi), 0 1px 2px var(--inset-lo)",
        }}
      >
        {/* tick ring */}
        <svg width={size} height={size} className="absolute inset-0" aria-hidden>
          {Array.from({ length: 21 }, (_, i) => {
            const a = ((START_ANGLE + (i / 20) * SWEEP - 90) * Math.PI) / 180;
            const r1 = size / 2 - 3;
            const r2 = size / 2 - 7;
            const lit = i / 20 <= value;
            return (
              <line
                key={i}
                x1={size / 2 + Math.cos(a) * r1}
                y1={size / 2 + Math.sin(a) * r1}
                x2={size / 2 + Math.cos(a) * r2}
                y2={size / 2 + Math.sin(a) * r2}
                stroke={lit ? "var(--accent)" : "var(--ink-faint)"}
                strokeWidth={lit ? 2 : 1}
              />
            );
          })}
        </svg>
        {/* pointer */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2"
          style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
        >
          <div
            style={{
              width: 3,
              height: size * 0.32,
              background: "var(--ink)",
              borderRadius: 2,
              transform: `translateY(${-size * 0.22}px)`,
            }}
          />
        </div>
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
        />
      </div>
      <span className="type-label">{label}</span>
    </div>
  );
}
