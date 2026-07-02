"use client";

import { useEffect, useState } from "react";

/** Re-renders on an interval aligned to it (default: once per second). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timeout = setTimeout(tick, intervalMs - (Date.now() % intervalMs));
    };
    timeout = setTimeout(tick, intervalMs - (Date.now() % intervalMs));
    return () => clearTimeout(timeout);
  }, [intervalMs]);
  return now;
}
