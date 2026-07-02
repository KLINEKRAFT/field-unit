"use client";

import { useState } from "react";
import { ToolScreen } from "@/components/ToolScreen";
import { TintablePage } from "@/components/TintablePage";
import { MechanicalButton } from "@/components/controls";
import { PermissionCard } from "@/components/states";
import { useCompass } from "@/lib/hooks/useCompass";
import { cardinalFromDegrees } from "@/lib/format";

export default function CompassPage() {
  const compass = useCompass();
  const [locked, setLocked] = useState<number | null>(null);

  const heading = compass.heading;
  const live = compass.status === "active" || compass.status === "demo";

  return (
    <TintablePage page="compass">
    <ToolScreen
      title="Compass"
      mode={compass.status === "demo" ? "DEMO" : live ? "LIVE" : "STANDBY"}
      lightOn={live}
      lightColor={compass.status === "demo" ? "sage" : "accent"}
    >
      <div className="mx-auto flex max-w-md flex-col gap-6">
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
            explanation="Motion access was declined. Re-enable it in iOS Settings → Safari → Motion & Orientation Access, or run the clearly-labelled demo dial."
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
                className="text-center text-xs font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--alert)" }}
                role="status"
              >
                Demo mode — simulated readings
              </p>
            )}

            <div className="flex justify-center py-4">
              <CompassDial heading={heading} locked={locked} />
            </div>

            <div className="text-center">
              <p className="type-display text-7xl" aria-live="off">
                {Math.round(heading)}°
              </p>
              <p className="type-label mt-3 text-sm">{cardinalFromDegrees(heading)}</p>
              {locked !== null && (
                <p className="type-meta mt-2">
                  To bearing {locked}°:{" "}
                  {Math.round(((((locked - heading) % 360) + 540) % 360) - 180)}°
                </p>
              )}
            </div>

            <div className="mx-auto w-full max-w-xs">
              <MechanicalButton
                className="w-full"
                active={locked !== null}
                onClick={() => setLocked(locked === null ? Math.round(heading) : null)}
              >
                {locked === null ? "Lock bearing" : `Locked ${locked}° — release`}
              </MechanicalButton>
            </div>

            {compass.needsCalibration && (
              <p className="text-center text-sm text-ink-muted" role="status">
                Accuracy is low — move your phone in a figure-eight, away from magnets and metal.
              </p>
            )}
          </>
        )}
      </div>
    </ToolScreen>
    </TintablePage>
  );
}

/**
 * The user's compass widget, live: fine muted tick ring, upright cardinal
 * letters (N in ink, others muted), two-tone kite needle with a hollow hub.
 * The whole card rotates against the fixed phone frame.
 */
function CompassDial({ heading, locked }: { heading: number; locked: number | null }) {
  const size = 300;
  const c = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        style={{ transform: `rotate(${-heading}deg)` }}
      >
        {/* fine tick ring */}
        {Array.from({ length: 120 }, (_, i) => {
          const deg = i * 3;
          const a = ((deg - 90) * Math.PI) / 180;
          const major = deg % 30 === 0;
          const r1 = c - (major ? 14 : 9);
          const r2 = c - 2;
          return (
            <line
              key={i}
              x1={c + Math.cos(a) * r1}
              y1={c + Math.sin(a) * r1}
              x2={c + Math.cos(a) * r2}
              y2={c + Math.sin(a) * r2}
              stroke="var(--ink)"
              strokeWidth={major ? 1.4 : 0.8}
              opacity={major ? 0.5 : 0.22}
            />
          );
        })}

        {/* cardinal letters */}
        {(["N", "E", "S", "W"] as const).map((letter, i) => {
          const a = ((i * 90 - 90) * Math.PI) / 180;
          const r = c - 44;
          const x = c + Math.cos(a) * r;
          const y = c + Math.sin(a) * r;
          return (
            <text
              key={letter}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${heading} ${x} ${y})`}
              fontSize={22}
              fontWeight={700}
              fill={letter === "N" ? "var(--ink)" : "var(--ink-muted)"}
              fontFamily="var(--font-sans)"
            >
              {letter}
            </text>
          );
        })}

        {/* two-tone needle: ink half points north, muted half south */}
        <polygon
          points={`${c},${c - 82} ${c + 11},${c} ${c - 11},${c}`}
          fill="var(--ink)"
        />
        <polygon
          points={`${c},${c + 82} ${c + 11},${c} ${c - 11},${c}`}
          fill="var(--ink-faint)"
        />
        <circle cx={c} cy={c} r={10} fill="var(--ink)" />
        <circle cx={c} cy={c} r={4.5} fill="var(--surface)" />

        {/* locked-bearing marker on the ring */}
        {locked !== null && (
          <g transform={`rotate(${locked} ${c} ${c})`}>
            <circle cx={c} cy={12} r={5} fill="var(--accent)" stroke="var(--ink)" strokeWidth={1.5} />
          </g>
        )}
      </svg>
    </div>
  );
}
