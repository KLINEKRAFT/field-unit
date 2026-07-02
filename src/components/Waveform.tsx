"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  /** live analyser node while recording / playing; null renders a flat line */
  analyser: AnalyserNode | null;
  height?: number;
  className?: string;
}

/**
 * Dot-matrix level display driven by a WebAudio AnalyserNode.
 * Renders discrete bars of stacked dots, like a mechanical VU meter.
 */
export function Waveform({ analyser, height = 96, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();

    const styles = getComputedStyle(canvas);
    const inkColor = styles.getPropertyValue("--ink").trim() || "#0a0a09";
    const faintColor = styles.getPropertyValue("--ink-faint").trim() || "#b9b6ae";
    const accentColor = styles.getPropertyValue("--accent").trim() || "#ffd84a";

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const dot = 3 * dpr;
      const gap = 3 * dpr;
      const cell = dot + gap;
      const cols = Math.floor(w / cell);
      const rowCount = Math.floor(h / cell);

      for (let c = 0; c < cols; c++) {
        let level = 0;
        if (analyser && data) {
          analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
          const bin = Math.floor((c / cols) * data.length * 0.7);
          level = (data[bin] ?? 0) / 255;
        }
        const litRows = Math.round(level * rowCount);
        for (let r = 0; r < rowCount; r++) {
          const lit = r < litRows;
          const isPeak = lit && r >= rowCount - 2 && level > 0.85;
          ctx.fillStyle = lit ? (isPeak ? accentColor : inkColor) : faintColor;
          ctx.globalAlpha = lit ? 1 : 0.25;
          ctx.beginPath();
          ctx.arc(
            c * cell + dot / 2 + gap / 2,
            h - (r * cell + dot / 2 + gap / 2),
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
      aria-label={analyser ? "Live audio level meter" : "Audio level meter, idle"}
    />
  );
}
