"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  /** live analyser node; null renders a resting center line of dots */
  analyser: AnalyserNode | null;
  height?: number;
  className?: string;
}

/**
 * Scrolling dot-matrix waveform. Each animation frame samples the current
 * loudness (RMS of the time-domain frame) and pushes it onto a rolling
 * history; the whole field scrolls right-to-left like a tape meter, so the
 * wave visibly flows rather than flickering in place. Amplitude is mirrored
 * around the center row. Values are the real signal — never synthesized.
 */
export function Waveform({ analyser, height = 120, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const history = useRef<number[]>([]);

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

    const dot = 3.4 * dpr;
    const gap = 4.2 * dpr;
    const cell = dot + gap;
    const cols = Math.max(1, Math.floor(canvas.width / cell));
    const rows = Math.max(1, Math.floor(canvas.height / cell));
    const centerRow = Math.floor(rows / 2);
    const xOffset = (canvas.width - cols * cell) / 2;
    const yOffset = (canvas.height - rows * cell) / 2;

    // seed / resize the rolling history to the column count
    if (history.current.length !== cols) history.current = new Array(cols).fill(0);

    const buf = analyser ? new Uint8Array(analyser.fftSize) : null;

    let last = 0;
    const STEP = 1000 / 45; // advance the scroll ~45 times a second

    const draw = (now: number) => {
      if (analyser && buf && now - last >= STEP) {
        last = now;
        analyser.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
        // RMS loudness of this frame, boosted for visible travel
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i]! - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.min(1, Math.sqrt(sumSq / buf.length) * 2.6);
        history.current.push(rms);
        if (history.current.length > cols) history.current.shift();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let c = 0; c < cols; c++) {
        const amp = history.current[c] ?? 0;
        const reach = Math.round(amp * centerRow);
        for (let r = 0; r < rows; r++) {
          const fromCenter = Math.abs(r - centerRow);
          const lit = fromCenter <= reach || r === centerRow;
          ctx.fillStyle = lit ? inkColor : faintColor;
          ctx.globalAlpha = lit ? 1 : 0.22;
          ctx.beginPath();
          ctx.arc(
            xOffset + c * cell + cell / 2,
            yOffset + r * cell + cell / 2,
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

    raf.current = requestAnimationFrame(draw);
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
