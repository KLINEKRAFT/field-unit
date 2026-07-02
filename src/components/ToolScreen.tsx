"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { StatusLight } from "./controls";

interface ToolScreenProps {
  title: string;
  /** short uppercase mode tag shown under the title, comp-style */
  mode?: string;
  lightOn?: boolean;
  lightColor?: "accent" | "sage" | "alert";
  actions?: ReactNode;
  children: ReactNode;
}

/** Flat full-screen instrument chrome: back arrow, title, mode line, lamp. */
export function ToolScreen({
  title,
  mode,
  lightOn = false,
  lightColor = "accent",
  actions,
  children,
}: ToolScreenProps) {
  const router = useRouter();
  return (
    <div className="flex min-h-full flex-col">
      <header className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back to instruments"
            className="-ml-2 flex h-11 w-11 items-center justify-center text-ink"
          >
            <ArrowLeft size={20} strokeWidth={2.2} aria-hidden />
          </button>
          {actions ?? <span className="w-11" aria-hidden />}
        </div>
        <div className="flex items-end justify-between pt-1">
          <div>
            <h1 className="type-title text-[32px]">{title}</h1>
            {mode ? (
              <p className="type-label mt-1.5">Field Unit · {mode}</p>
            ) : null}
          </div>
          <span className="pb-2">
            <StatusLight on={lightOn} color={lightColor} label={`${title} status`} />
          </span>
        </div>
      </header>
      <div className="flex-1 px-5 pb-8 pt-4">{children}</div>
    </div>
  );
}
