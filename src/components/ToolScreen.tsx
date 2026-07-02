"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { StatusLight } from "./controls";

interface ToolScreenProps {
  title: string;
  /** short uppercase mode tag shown next to the status lamp */
  mode?: string;
  lightOn?: boolean;
  lightColor?: "accent" | "sage" | "alert";
  actions?: ReactNode;
  children: ReactNode;
}

/** Full-screen instrument chrome: back control, title row, mode lamp. */
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
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back to instruments"
            className="control flex h-11 w-11 items-center justify-center"
          >
            <ArrowLeft size={18} strokeWidth={2.2} aria-hidden />
          </button>
          <div className="flex items-center gap-2">
            {mode ? <span className="type-label">{mode}</span> : null}
            <StatusLight on={lightOn} color={lightColor} label={`${title} status`} />
          </div>
          {actions ?? <span className="w-11" aria-hidden />}
        </div>
        <div className="px-4 pb-3">
          <h1 className="type-title text-3xl">{title}</h1>
        </div>
        <div className="hairline-b" aria-hidden />
      </header>
      <div className="flex-1 px-4 pb-8 pt-4">{children}</div>
    </div>
  );
}
