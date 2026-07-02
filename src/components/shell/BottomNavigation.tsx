"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, PenLine, CalendarDays, Settings } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const DESTINATIONS = [
  { href: "/", label: "Instruments", icon: LayoutGrid },
  { href: "/notes", label: "Notes", icon: PenLine },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/**
 * Mode selector, styled like a mechanical switch bank. A sliding signal
 * indicator marks the engaged section.
 */
export function BottomNavigation() {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  const activeIndex = DESTINATIONS.findIndex((d) =>
    d.href === "/" ? pathname === "/" || isToolPath(pathname) : pathname.startsWith(d.href),
  );

  return (
    <nav aria-label="Primary" className="app-nav">
      <div className="relative mx-auto flex max-w-md">
        {DESTINATIONS.map((d, i) => {
          const active = i === activeIndex;
          const Icon = d.icon;
          return (
            <Link
              key={d.href}
              href={d.href}
              aria-current={active ? "page" : undefined}
              className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1"
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  aria-hidden
                  transition={
                    reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }
                  }
                  className="absolute top-0 h-[3px] w-8 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.8}
                aria-hidden
                className={active ? "text-ink" : "text-ink-muted"}
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                {d.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const TOOL_PATHS = ["/clock", "/compass", "/weather", "/radio", "/alarms", "/recorder"];

function isToolPath(pathname: string): boolean {
  return TOOL_PATHS.some((p) => pathname.startsWith(p));
}
