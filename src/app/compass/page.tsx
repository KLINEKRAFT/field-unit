"use client";

import { useState } from "react";
import { ToolScreen } from "@/components/ToolScreen";
import { MechanicalButton, MeasurementRow } from "@/components/controls";
import { PermissionCard } from "@/components/states";
import { useCompass } from "@/lib/hooks/useCompass";
import { cardinalFromDegrees } from "@/lib/format";

export default function CompassPage() {
  const compass = useCompass();
  const [locked, setLocked] = useState<number | null>(null);

  const heading = compass.heading;
  const live = compass.status === "active" || compass.status === "demo";

  return (
    <ToolScreen
      title="Compass"
      mode={compass.status === "demo" ? "DEMO" : live ? "LIVE" : "STANDBY"}
      lightOn={live}
      lightColor={compass.status === "demo" ? "sage" : "accent"}
    >
      <div className="mx-auto flex max-w-md flex-col gap-5">
        {compass.status === "idle" && (
          <PermissionCard
            title="Motion access"
            explanation="The compass reads your device's orientation sensor to show your heading. iOS will ask for motion & orientation permission — the reading never leaves your phone."
            actionLabel="Engage compass"
            onAction={() => void compass.requestStart()}
            secondary={{ label: "Run demo instead", onClick: compass.startDemo }}
          />
        )}

        {compass.status === "denied" && (
          <PermissionCard
            title="Permission denied"
            explanation="Motion access was declined. You can re-enable it in iOS Settings → Safari → Motion & Orientation Access, or run the clearly-labelled demo dial."
            actionLabel="Try again"
            onAction={() => void compass.requestStart()}
            secondary={{ label: "Run demo instead", onClick: compass.startDemo }}
          />
        )}

        {compass.status === "unsupported" && (
          <PermissionCard
            title="No orientation sensor"
            explanation="This device or browser doesn't expose a compass sensor. The demo mode shows how the instrument behaves — it is simulated, not a real reading."
            actionLabel="Run demo"
            onAction={compass.startDemo}
          />
        )}

        {live && heading !== null && (
          <>
            {compass.status === "demo" && (
              <p
                className="panel-inset px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--alert)" }}
                role="status"
              >
                Demo mode — simulated readings
              </p>
            )}

            <section className="panel flex flex-col items-center gap-6 px-4 py-8">
              <CompassDial heading={heading} locked={locked} />
              <div className="text-center">
                <p className="type-measure segments text-6xl" aria-live="off">
                  {Math.round(heading)}°
                </p>
                <p className="type-label mt-2 text-base">{cardinalFromDegrees(heading)}</p>
              </div>
              <div className="flex w-full max-w-xs gap-2">
                <MechanicalButton
                  className="flex-1"
                  active={locked !== null}
                  onClick={() => setLocked(locked === null ? Math.round(heading) : null)}
                >
                  {locked === null ? "Lock bearing" : `Locked ${locked}°`}
                </MechanicalButton>
              </div>
            </section>

            <section className="panel-inset px-4 py-1">
              <MeasurementRow label="Heading" value={`${Math.round(heading)}°`} />
              <MeasurementRow label="Cardinal" value={cardinalFromDegrees(heading)} />
              {locked !== null && (
                <MeasurementRow
                  label="To bearing"
                  value={`${Math.round((((locked - heading) % 360) + 540) % 360 - 180)}°`}
                />
              )}
            </section>

            {compass.needsCalibration && (
              <p className="panel-inset px-4 py-3 text-sm text-ink-muted" role="status">
                Accuracy is low. Calibrate by moving your phone in a figure-eight pattern, away
                from magnets and metal.
              </p>
            )}
          </>
        )}
      </div>
    </ToolScreen>
  );
}

function CompassDial({ heading, locked }: { heading: number; locked: number | null }) {
  const size = 280;
  const c = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* fixed lubber line */}
      <div
        aria-hidden
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "14px solid var(--accent)",
        }}
      />
      {/* rotating card — dampened by the smoothing in useCompass */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        style={{ transform: `rotate(${-heading}deg)` }}
      >
        <circle cx={c} cy={c} r={c - 4} fill="var(--surface)" stroke="var(--line-strong)" />
        {Array.from({ length: 72 }, (_, i) => {
          const deg = i * 5;
          const a = ((deg - 90) * Math.PI) / 180;
          const major = deg % 30 === 0;
          const r1 = c - (major ? 22 : 14);
          const r2 = c - 8;
          return (
            <line
              key={i}
              x1={c + Math.cos(a) * r1}
              y1={c + Math.sin(a) * r1}
              x2={c + Math.cos(a) * r2}
              y2={c + Math.sin(a) * r2}
              stroke="var(--ink)"
              strokeWidth={major ? 2 : 1}
              opacity={major ? 0.9 : 0.35}
            />
          );
        })}
        {(["N", "E", "S", "W"] as const).map((letter, i) => {
          const a = ((i * 90 - 90) * Math.PI) / 180;
          const r = c - 44;
          return (
            <text
              key={letter}
              x={c + Math.cos(a) * r}
              y={c + Math.sin(a) * r}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${i * 90} ${c + Math.cos(a) * r} ${c + Math.sin(a) * r})`}
              fontSize={22}
              fontWeight={700}
              fill={letter === "N" ? "var(--alert)" : "var(--ink)"}
              fontFamily="var(--font-sans)"
            >
              {letter}
            </text>
          );
        })}
        {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
          const a = ((deg - 90) * Math.PI) / 180;
          const r = c - 44;
          return (
            <text
              key={deg}
              x={c + Math.cos(a) * r}
              y={c + Math.sin(a) * r}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${deg} ${c + Math.cos(a) * r} ${c + Math.sin(a) * r})`}
              fontSize={11}
              fill="var(--ink-muted)"
              fontFamily="var(--font-mono)"
            >
              {deg}
            </text>
          );
        })}
        {/* north pointer on the card */}
        <polygon points={`${c},26 ${c + 7},52 ${c},44 ${c - 7},52`} fill="var(--alert)" />
        {/* locked-bearing marker */}
        {locked !== null && (
          <g transform={`rotate(${locked} ${c} ${c})`}>
            <circle cx={c} cy={16} r={5} fill="var(--accent)" stroke="var(--ink)" />
          </g>
        )}
        <circle cx={c} cy={c} r={4} fill="var(--ink)" />
      </svg>
    </div>
  );
}
