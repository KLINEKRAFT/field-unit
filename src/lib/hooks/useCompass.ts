"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CompassStatus =
  | "idle" // waiting for user to start
  | "prompt" // explanation shown, permission not yet requested
  | "active" // live sensor data flowing
  | "denied"
  | "unsupported"
  | "demo";

interface CompassState {
  status: CompassStatus;
  /** smoothed heading in degrees, 0 = north */
  heading: number | null;
  /** raw sensor accuracy hint — iOS provides webkitCompassAccuracy */
  needsCalibration: boolean;
}

interface DeviceOrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

interface DeviceOrientationEventConstructorIOS {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/** Shortest-path angular smoothing so the needle feels dampened, not jittery. */
function smoothHeading(prev: number | null, next: number, factor = 0.18): number {
  if (prev === null) return next;
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return (prev + delta * factor + 360) % 360;
}

export function useCompass() {
  const [state, setState] = useState<CompassState>({
    status: "idle",
    heading: null,
    needsCalibration: false,
  });
  const smoothed = useRef<number | null>(null);
  const listening = useRef(false);
  const demoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const e = event as DeviceOrientationEventIOS;
    let heading: number | null = null;
    if (typeof e.webkitCompassHeading === "number") {
      heading = e.webkitCompassHeading;
    } else if (event.absolute && event.alpha !== null) {
      heading = (360 - event.alpha) % 360;
    }
    if (heading === null) return;
    smoothed.current = smoothHeading(smoothed.current, heading);
    setState({
      status: "active",
      heading: smoothed.current,
      needsCalibration:
        typeof e.webkitCompassAccuracy === "number" &&
        (e.webkitCompassAccuracy < 0 || e.webkitCompassAccuracy > 30),
    });
  }, []);

  const stop = useCallback(() => {
    if (listening.current) {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      listening.current = false;
    }
    if (demoTimer.current) {
      clearInterval(demoTimer.current);
      demoTimer.current = null;
    }
  }, [handleOrientation]);

  const startListening = useCallback(() => {
    // Prefer the absolute event where available (Android Chrome)
    const hasAbsolute = "ondeviceorientationabsolute" in (window as object);
    window.addEventListener(
      hasAbsolute ? "deviceorientationabsolute" : "deviceorientation",
      handleOrientation as EventListener,
    );
    listening.current = true;
    // If no readings arrive shortly, the device has no usable sensor.
    setTimeout(() => {
      if (smoothed.current === null) {
        stop();
        setState((s) => (s.status === "active" ? s : { ...s, status: "unsupported" }));
      }
    }, 2500);
    setState((s) => ({ ...s, status: "active" }));
  }, [handleOrientation, stop]);

  /** Call from a user gesture. Handles the iOS permission dance. */
  const requestStart = useCallback(async () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setState((s) => ({ ...s, status: "unsupported" }));
      return;
    }
    const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructorIOS;
    if (typeof ctor.requestPermission === "function") {
      try {
        const result = await ctor.requestPermission();
        if (result !== "granted") {
          setState((s) => ({ ...s, status: "denied" }));
          return;
        }
      } catch {
        setState((s) => ({ ...s, status: "denied" }));
        return;
      }
    }
    startListening();
  }, [startListening]);

  /** Clearly-labelled simulated dial for environments without a sensor. */
  const startDemo = useCallback(() => {
    stop();
    smoothed.current = 0;
    let target = 40;
    demoTimer.current = setInterval(() => {
      target += (Math.sin(Date.now() / 4000) + Math.sin(Date.now() / 9000)) * 2.4;
      smoothed.current = smoothHeading(smoothed.current, (target + 360) % 360, 0.1);
      setState({ status: "demo", heading: smoothed.current, needsCalibration: false });
    }, 80);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { ...state, requestStart, startDemo, stop };
}
