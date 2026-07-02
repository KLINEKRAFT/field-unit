"use client";

/** Mechanical control primitives shared across all instruments. */

import { playTick } from "@/lib/sound";
import type { ReactNode } from "react";

interface MechanicalButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  silent?: boolean;
  htmlType?: "button" | "submit";
}

export function MechanicalButton({
  children,
  onClick,
  variant = "default",
  size = "md",
  active = false,
  disabled = false,
  ariaLabel,
  className = "",
  silent = false,
  htmlType = "button",
}: MechanicalButtonProps) {
  const sizes = {
    sm: "min-h-[44px] px-3 text-xs",
    md: "min-h-[48px] px-4 text-sm",
    lg: "min-h-[56px] px-6 text-base",
  };
  const variants = {
    default: active
      ? "bg-accent text-accent-ink border-line-strong"
      : "bg-panel text-ink border-line-strong",
    primary: "bg-ink text-surface border-transparent",
    danger: "bg-alert text-white border-transparent",
    ghost: "bg-transparent text-ink border-line",
  };
  return (
    <button
      type={htmlType}
      aria-label={ariaLabel}
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={() => {
        if (!silent) playTick();
        onClick?.();
      }}
      className={`control type-btn flex items-center justify-center gap-2 ${sizes[size]} ${variants[variant]} ${
        disabled ? "opacity-40 pointer-events-none" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** A physical slide switch: rectangular track, square thumb, hard travel. */
export function ToggleSwitch({ checked, onChange, label, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        playTick();
        onChange(!checked);
      }}
      className={`relative h-8 w-14 shrink-0 rounded-[8px] border transition-colors duration-150 ${
        checked ? "bg-accent border-line-strong" : "bg-panel-2 border-line"
      } ${disabled ? "opacity-40" : ""}`}
      style={{ boxShadow: "inset 0 1px 2px var(--inset-lo)" }}
    >
      <span
        aria-hidden
        className="absolute top-[3px] h-[24px] w-[24px] rounded-[6px] bg-ink transition-[left] duration-150 ease-out"
        style={{
          left: checked ? "calc(100% - 27px)" : "3px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      />
    </button>
  );
}

interface StatusLightProps {
  on: boolean;
  color?: "accent" | "sage" | "alert";
  label: string;
  pulse?: boolean;
}

/** Small round indicator lamp. Never the only carrier of state — pair with text. */
export function StatusLight({ on, color = "accent", label, pulse = false }: StatusLightProps) {
  const colors = { accent: "var(--accent)", sage: "var(--sage)", alert: "var(--alert)" };
  return (
    <span
      role="status"
      aria-label={`${label}: ${on ? "on" : "off"}`}
      className={`inline-block h-2.5 w-2.5 rounded-full border border-line-strong ${
        on && pulse ? "animate-pulse" : ""
      }`}
      style={{
        background: on ? colors[color] : "var(--panel-2)",
        boxShadow: on ? `0 0 6px ${colors[color]}` : "inset 0 1px 1px var(--inset-lo)",
      }}
    />
  );
}

interface MeasurementRowProps {
  label: string;
  value: string;
  sub?: string;
}

export function MeasurementRow({ label, value, sub }: MeasurementRowProps) {
  return (
    <div className="flex items-baseline justify-between py-2.5 hairline-b last:border-b-0">
      <span className="type-label">{label}</span>
      <span className="type-measure text-base">
        {value}
        {sub ? <span className="ml-1 text-xs text-ink-muted">{sub}</span> : null}
      </span>
    </div>
  );
}

interface SpeakerPatternProps {
  rows?: number;
  cols?: number;
  dotSize?: number;
  gap?: number;
  /** fraction of dots randomly omitted for an analog feel (deterministic) */
  className?: string;
}

/** Perforated speaker-grille dot field, circular mask like drilled metal. */
export function SpeakerPattern({
  rows = 9,
  cols = 9,
  dotSize = 4,
  gap = 6,
  className,
}: SpeakerPatternProps) {
  const cell = dotSize + gap;
  const w = cols * cell - gap;
  const h = rows * cell - gap;
  const cxc = (cols - 1) / 2;
  const cyc = (rows - 1) / 2;
  const maxR = Math.min(cxc, cyc) + 0.5;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className={className}>
      {Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => {
          if (Math.hypot(x - cxc, y - cyc) > maxR) return null;
          return (
            <circle
              key={`${x}-${y}`}
              cx={x * cell + dotSize / 2}
              cy={y * cell + dotSize / 2}
              r={dotSize / 2}
              fill="currentColor"
            />
          );
        }),
      )}
    </svg>
  );
}
