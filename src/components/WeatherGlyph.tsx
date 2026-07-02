/**
 * Weather symbols built from dot grids and circles — no cartoon icons.
 * Follows the halftone visual language of the reference instruments.
 */
import type { ConditionKind } from "@/lib/weather/provider";

interface WeatherGlyphProps {
  kind: ConditionKind;
  size?: number;
  className?: string;
  label?: string;
}

type Dot = { x: number; y: number; r: number; o?: number };

function sunDots(cx: number, cy: number, radius: number): Dot[] {
  const dots: Dot[] = [];
  const step = radius / 4.2;
  for (let y = -radius; y <= radius; y += step) {
    for (let x = -radius; x <= radius; x += step) {
      if (Math.hypot(x, y) <= radius) dots.push({ x: cx + x, y: cy + y, r: step * 0.34 });
    }
  }
  // rays: paired dots at 8 compass points
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    for (const d of [radius * 1.35, radius * 1.6]) {
      dots.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: step * 0.3 });
    }
  }
  return dots;
}

function cloudDots(cx: number, cy: number, s: number, opacity = 1): Dot[] {
  const dots: Dot[] = [];
  const step = s / 9;
  const inCloud = (x: number, y: number): boolean => {
    const c1 = Math.hypot(x + s * 0.3, y + s * 0.05) <= s * 0.3;
    const c2 = Math.hypot(x - s * 0.05, y + s * 0.22) <= s * 0.34;
    const c3 = Math.hypot(x - s * 0.38, y + s * 0.02) <= s * 0.26;
    const base = y >= -s * 0.02 && y <= s * 0.22 && x >= -s * 0.52 && x <= s * 0.56;
    return c1 || c2 || c3 || base;
  };
  for (let y = -s * 0.6; y <= s * 0.25; y += step) {
    for (let x = -s * 0.62; x <= s * 0.66; x += step) {
      if (inCloud(x, y)) dots.push({ x: cx + x, y: cy + y, r: step * 0.36, o: opacity });
    }
  }
  return dots;
}

function precipDots(cx: number, cy: number, s: number, kind: "rain" | "snow" | "drizzle"): Dot[] {
  const dots: Dot[] = [];
  const cols = kind === "drizzle" ? 3 : 4;
  for (let i = 0; i < cols; i++) {
    const x = cx - s * 0.32 + (i * s * 0.64) / (cols - 1);
    const rows = kind === "snow" ? 2 : 3;
    for (let j = 0; j < rows; j++) {
      const y = cy + s * 0.42 + j * s * 0.16 + (i % 2) * s * 0.07;
      dots.push({ x, y, r: kind === "snow" ? s * 0.045 : s * 0.032 });
    }
  }
  return dots;
}

export function WeatherGlyph({ kind, size = 120, className, label }: WeatherGlyphProps) {
  const s = size / 2.6;
  const cx = size / 2;
  const cy = size / 2;
  let dots: Dot[] = [];
  let accentDots: Dot[] = [];
  let extra: React.ReactNode = null;

  switch (kind) {
    case "clear":
      accentDots = sunDots(cx, cy, s * 0.72);
      break;
    case "partly":
      accentDots = sunDots(cx - s * 0.35, cy - s * 0.3, s * 0.48);
      dots = cloudDots(cx + s * 0.22, cy + s * 0.28, s * 0.9);
      break;
    case "cloudy":
      dots = cloudDots(cx, cy + s * 0.1, s * 1.05);
      break;
    case "fog":
      dots = cloudDots(cx, cy - s * 0.15, s * 0.85, 0.55);
      extra = [0, 1, 2].map((i) => (
        <g key={i}>
          {Array.from({ length: 9 }, (_, j) => (
            <circle
              key={j}
              cx={cx - s * 0.5 + j * s * 0.125 + (i % 2) * s * 0.06}
              cy={cy + s * 0.42 + i * s * 0.18}
              r={s * 0.03}
              fill="currentColor"
              opacity={0.7}
            />
          ))}
        </g>
      ));
      break;
    case "drizzle":
      dots = [...cloudDots(cx, cy - s * 0.12, s * 0.9), ...precipDots(cx, cy, s, "drizzle")];
      break;
    case "rain":
      dots = [...cloudDots(cx, cy - s * 0.12, s * 0.9), ...precipDots(cx, cy, s, "rain")];
      break;
    case "snow":
      dots = [...cloudDots(cx, cy - s * 0.12, s * 0.9), ...precipDots(cx, cy, s, "snow")];
      break;
    case "thunder":
      dots = cloudDots(cx, cy - s * 0.18, s * 0.95);
      extra = (
        <polygon
          points={`${cx + s * 0.12},${cy + s * 0.18} ${cx - s * 0.18},${cy + s * 0.62} ${cx + s * 0.02},${cy + s * 0.62} ${cx - s * 0.1},${cy + s * 0.98}`}
          fill="var(--accent)"
          stroke="none"
        />
      );
      break;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? kind}
      className={className}
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="currentColor" opacity={d.o ?? 1} />
      ))}
      {accentDots.map((d, i) => (
        <circle key={`a${i}`} cx={d.x} cy={d.y} r={d.r} fill="var(--accent)" opacity={d.o ?? 1} />
      ))}
      {extra}
    </svg>
  );
}
