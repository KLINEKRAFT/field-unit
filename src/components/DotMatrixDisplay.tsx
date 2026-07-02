/**
 * Renders text as a true 5x7 dot-matrix, the signature display treatment of
 * the app. Pure SVG — crisp at any size, themeable via currentColor.
 */

const GLYPHS: Record<string, number[]> = {
  // Each glyph: 7 rows of 5-bit values (MSB = leftmost dot)
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0b00100, 0b00100],
  ":": [0, 0b00100, 0b00100, 0, 0b00100, 0b00100, 0],
  "-": [0, 0, 0, 0b01110, 0, 0, 0],
  "°": [0b01100, 0b10010, 0b10010, 0b01100, 0, 0, 0],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  "'": [0b00100, 0b00100, 0, 0, 0, 0, 0],
  "%": [0b11001, 0b11010, 0b00010, 0b00100, 0b01000, 0b01011, 0b10011],
};

interface DotMatrixDisplayProps {
  text: string;
  /** dot diameter in px */
  dotSize?: number;
  /** gap between dots in px */
  gap?: number;
  /** render unlit dots faintly, like a real matrix panel */
  showGrid?: boolean;
  /** scale down to fit the container width instead of overflowing */
  fluid?: boolean;
  className?: string;
  label?: string;
}

export function DotMatrixDisplay({
  text,
  dotSize = 3,
  gap = 1.5,
  showGrid = false,
  fluid = false,
  className,
  label,
}: DotMatrixDisplayProps) {
  const chars = text.toUpperCase().split("");
  const cell = dotSize + gap;
  const charWidth = 5 * cell + cell; // 5 columns + 1 spacer column
  const width = chars.length * charWidth - cell;
  const height = 7 * cell - gap;

  return (
    <svg
      width={fluid ? undefined : width}
      height={fluid ? undefined : height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? text}
      className={className}
      style={fluid ? { display: "block", width: "100%", maxWidth: width, height: "auto" } : { display: "block" }}
    >
      {chars.map((ch, ci) => {
        const glyph = GLYPHS[ch] ?? GLYPHS[" "]!;
        const originX = ci * charWidth;
        return glyph.flatMap((row, ry) =>
          Array.from({ length: 5 }, (_, cx) => {
            const lit = (row >> (4 - cx)) & 1;
            if (!lit && !showGrid) return null;
            return (
              <circle
                key={`${ci}-${ry}-${cx}`}
                cx={originX + cx * cell + dotSize / 2}
                cy={ry * cell + dotSize / 2}
                r={dotSize / 2}
                fill="currentColor"
                opacity={lit ? 1 : 0.12}
              />
            );
          }),
        );
      })}
    </svg>
  );
}
