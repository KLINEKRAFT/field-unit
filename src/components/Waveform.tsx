"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  /** live analyser node; null renders a resting center line of dots */
  analyser: AnalyserNode | null;
  height?: number;
  className?: string;
}

/**
 * Real waveform on the dot-matrix grid: each column is a time-domain sample,
 * lit symmetrically around the center row — the display language of the
 * user's recorder comp.
 */
export function Waveform({ analyser, height = 120, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;

    const styles = getComputedStyle(canvas);
    const inkColor = styles.getPropertyValue("--ink").trim() || "#080808";
    const faintColor = styles.getPropertyValue("--ink-faint").trim() || "#b3ada0";

    const data = analyser ? new Uint8Array(analyser.fftSize) : null;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const dot = 3.4 * dpr;
      const gap = 4.2 * dpr;
      const cell = dot + gap;
      const cols = Math.floor(w / cell);
      const rows = Math.floor(h / cell);
      const centerRow = Math.floor(rows / 2);
      const xOffset = (w - cols * cell) / 2;

      if (analyser && data) analyser.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>);

      for (let c = 0; c < cols; c++) {
        let amplitude = 0;
        if (analyser && data) {
          // average |sample| over this column's slice for a stable shape
          const slice = Math.floor(data.length / cols);
          let sum = 0;
          for (let k = 0; k < slice; k++) sum += Math.abs((data[c * slice + k] ?? 128) - 128);
          amplitude = Math.min(1, (sum / slice / 128) * 2.2);
        }
        const reach = Math.round(amplitude * centerRow);
        for (let r = 0; r < rows; r++) {
          const fromCenter = Math.abs(r - centerRow);
          const lit = fromCenter <= reach || r === centerRow;
          ctx.fillStyle = lit ? inkColor : faintColor;
          ctx.globalAlpha = lit ? 1 : 0.22;
          ctx.beginPath();
          ctx.arc(
            xOffset + c * cell + cell / 2,
            r * cell + cell / 2 + (h - rows * cell) / 2,
            dot / 2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (analyser) raf.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height, display: "block" }}
      role="img"
      aria-label={analyser ? "Live audio waveform" : "Audio waveform, idle"}
    />
  );
}
