"use client";

import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed left-1/2 z-30 -translate-x-1/2"
      style={{ bottom: "calc(var(--sab) + 20px)" }}
    >
      <span className="panel flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em]">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "var(--alert)" }} />
        Offline
      </span>
    </div>
  );
}
