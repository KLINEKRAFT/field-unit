/**
 * Instrument icons drawn in the Dieter Rams / Braun idiom: precise geometry,
 * a single consistent stroke weight, perfect circles, generous negative space,
 * no decoration. One 24-unit grid, monochrome (currentColor). These replace
 * the earlier dot-cluster icons on the home board.
 */
import type { ReactNode } from "react";

const STROKE = 1.5;

function base(children: ReactNode, size: number) {
  // Home icons are always paired with a visible text label, so the mark itself
  // is decorative — keep it out of the accessibility tree.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, (size: number) => ReactNode> = {
  /** Sun: a true circle with eight short radial marks — Braun clock-index geometry. */
  weather: (s) =>
    base(
      <>
        <circle cx="12" cy="12" r="4.4" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={12 + Math.cos(a) * 7}
              y1={12 + Math.sin(a) * 7}
              x2={12 + Math.cos(a) * 9.4}
              y2={12 + Math.sin(a) * 9.4}
            />
          );
        })}
      </>,
      s,
    ),

  /** Compass: precise ring, a slim north triangle and a filled hub. */
  compass: (s) =>
    base(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 4.5 L14.4 12 L12 10.4 L9.6 12 Z" fill="currentColor" stroke="none" />
        <path d="M12 19.5 L14.4 12 L12 13.6 L9.6 12 Z" fill="currentColor" opacity="0.25" stroke="none" />
        <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      </>,
      s,
    ),

  /** Braun tabletop radio: rounded cabinet, circular speaker, thumb dial, antenna. */
  radio: (s) =>
    base(
      <>
        <line x1="15" y1="7.5" x2="20" y2="4" />
        <rect x="2.5" y="7.5" width="19" height="12" rx="2.2" />
        <circle cx="8" cy="13.5" r="3" />
        <line x1="14.5" y1="11.5" x2="18.5" y2="11.5" />
        <line x1="14.5" y1="15.5" x2="18.5" y2="15.5" />
      </>,
      s,
    ),

  /** Studio microphone: capsule, cradle arc, stem, base. */
  recorder: (s) =>
    base(
      <>
        <rect x="9.5" y="2.5" width="5" height="10.5" rx="2.5" />
        <path d="M6.5 12 A5.5 5.5 0 0 0 17.5 12" />
        <line x1="12" y1="17.5" x2="12" y2="20.5" />
        <line x1="8.5" y1="20.5" x2="15.5" y2="20.5" />
      </>,
      s,
    ),

  /** Notes: four ruled lines, the last one short — pure typographic restraint. */
  notes: (s) =>
    base(
      <>
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="10.5" x2="20" y2="10.5" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="4" y1="19.5" x2="13" y2="19.5" />
      </>,
      s,
    ),

  /** Calendar: framed sheet, header rule, two binding posts, a marked day. */
  calendar: (s) =>
    base(
      <>
        <line x1="8" y1="2.5" x2="8" y2="5.5" />
        <line x1="16" y1="2.5" x2="16" y2="5.5" />
        <rect x="3.5" y="4" width="17" height="17" rx="2.2" />
        <line x1="3.5" y1="8.5" x2="20.5" y2="8.5" />
        <circle cx="12" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
      </>,
      s,
    ),

  /** Clock: plain face, hands at 10:10 — the Braun/Rams watch signature. */
  clock: (s) =>
    base(
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="12" x2="12" y2="6.8" />
        <line x1="12" y1="12" x2="15.6" y2="13.6" />
        <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      </>,
      s,
    ),

  /** Twin-bell alarm clock — the classic Braun form: two bells, feet, hands. */
  alarm: (s) =>
    base(
      <>
        <circle cx="9.2" cy="4.6" r="2.1" />
        <circle cx="14.8" cy="4.6" r="2.1" />
        <path d="M9 4 L15 4" />
        <circle cx="12" cy="14" r="6.4" />
        <line x1="12" y1="14" x2="12" y2="10.2" />
        <line x1="12" y1="14" x2="14.6" y2="14" />
        <line x1="6.6" y1="19.4" x2="5.2" y2="21" />
        <line x1="17.4" y1="19.4" x2="18.8" y2="21" />
      </>,
      s,
    ),
};

export type RamsIconName = keyof typeof ICONS;

export function RamsIcon({
  name,
  size = 40,
  className,
}: {
  name: RamsIconName;
  size?: number;
  className?: string;
}) {
  const render = ICONS[name];
  if (!render) return null;
  return <span className={className}>{render(size)}</span>;
}
