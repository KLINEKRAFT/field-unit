/**
 * Instrument icons on a 15x15 dot grid — the same generative grammar the
 * user's design comp uses (distance fields over a dot lattice). Each icon is
 * a predicate deciding which lattice points are lit.
 */

const N = 15;
const C = (N - 1) / 2; // 7 — grid center

type Predicate = (row: number, col: number) => boolean;

const dist = (r: number, c: number, cr: number, cc: number) => Math.hypot(r - cr, c - cc);

const ring = (r: number, c: number, cr: number, cc: number, inner: number, outer: number) => {
  const d = dist(r, c, cr, cc);
  return d >= inner && d <= outer;
};

const ICONS = {
  /** sun disc + 8 rays — mirrors the user's weather sun */
  weather: (r, c) => {
    if (dist(r, c, C, C) <= 2.6) return true;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      for (const rad of [4.6, 6]) {
        if (dist(r, c, C + Math.sin(a) * rad, C + Math.cos(a) * rad) < 0.55) return true;
      }
    }
    return false;
  },

  /** ring + needle cross */
  compass: (r, c) => {
    if (ring(r, c, C, C, 5.4, 6.4)) return true;
    if (c === C && r >= 2 && r <= 12) return true;
    if (r === C && c >= 4 && c <= 10) return true;
    // arrowhead pointing north
    if (r === 3 && (c === C - 1 || c === C + 1)) return true;
    if (r === 4 && (c === C - 2 || c === C + 2)) return true;
    return false;
  },

  /** boxy receiver: cabinet, dial, speaker slats, antenna */
  radio: (r, c) => {
    const top = 5;
    const bottom = 12;
    // cabinet outline
    if ((r === top || r === bottom) && c >= 1 && c <= 13) return true;
    if ((c === 1 || c === 13) && r >= top && r <= bottom) return true;
    // tuning dial (left)
    if (dist(r, c, 8.5, 4.5) <= 1.4) return true;
    // speaker slats (right)
    if ((r === 7 || r === 9) && c >= 8 && c <= 11) return true;
    // antenna
    if ((r === 4 && c === 9) || (r === 3 && c === 10) || (r === 2 && c === 11) || (r === 1 && c === 12))
      return true;
    return false;
  },

  /** microphone: capsule, cradle, stem, base */
  recorder: (r, c) => {
    if (r >= 1 && r <= 6 && Math.abs(c - C) <= 1) return true; // capsule
    if (r >= 5 && r <= 7 && (c === C - 3 || c === C + 3)) return true; // cradle sides
    if (r === 8 && Math.abs(c - C) <= 2) return true; // cradle bottom
    if ((r === 9 || r === 10) && c === C) return true; // stem
    if (r === 11 && Math.abs(c - C) <= 2) return true; // base
    return false;
  },

  /** document with text lines */
  notes: (r, c) => {
    if ((r === 1 || r === 13) && c >= 3 && c <= 11) return true;
    if ((c === 3 || c === 11) && r >= 1 && r <= 13) return true;
    if ((r === 4 || r === 7 || r === 10) && c >= 5 && c <= 9) return true;
    return false;
  },

  /** calendar: pins, frame, date dots */
  calendar: (r, c) => {
    if (r === 1 && (c === 4 || c === 10)) return true; // pins
    if ((r === 3 || r === 13) && c >= 1 && c <= 13) return true;
    if ((c === 1 || c === 13) && r >= 3 && r <= 13) return true;
    if (r === 5 && c >= 1 && c <= 13) return true; // header rule
    if ((r === 8 || r === 11) && (c === 4 || c === 7 || c === 10)) return true;
    return false;
  },

  /** clock face with hands at ten past ten */
  clock: (r, c) => {
    if (ring(r, c, C, C, 5.4, 6.4)) return true;
    if (c === C && r >= 3 && r <= C) return true; // minute hand up
    if (r === C && c >= C && c <= 10) return true; // hour hand right
    return false;
  },

  /** alarm bell: handle, stepped dome outline, skirt, clapper */
  alarm: (r, c) => {
    if (r === 2 && Math.abs(c - C) <= 1) return true; // handle
    const halfWidth = r === 3 ? 1 : r === 4 ? 2 : r <= 6 ? 3 : 4; // dome steps
    if (r >= 3 && r <= 8 && Math.abs(c - C) === halfWidth) return true; // dome sides
    if (r === 8 && Math.abs(c - C) <= 4) return true; // dome base
    if (r === 9 && c >= 2 && c <= 12) return true; // skirt
    if (r === 11 && c === C) return true; // clapper
    return false;
  },
} satisfies Record<string, Predicate>;

export type DotIconName = keyof typeof ICONS;

interface DotIconProps {
  name: DotIconName;
  size?: number;
  className?: string;
  label?: string;
}

export function DotIcon({ name, size = 56, className, label }: DotIconProps) {
  const predicate = ICONS[name];
  const cell = size / N;
  const r = cell * 0.32;
  const dots: React.ReactNode[] = [];
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (predicate(row, col)) {
        dots.push(
          <circle
            key={`${row}-${col}`}
            cx={col * cell + cell / 2}
            cy={row * cell + cell / 2}
            r={r}
            fill="currentColor"
          />,
        );
      }
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? name}
      className={className}
    >
      {dots}
    </svg>
  );
}
