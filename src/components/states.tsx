"use client";

import type { ReactNode } from "react";
import { MechanicalButton } from "./controls";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

export function EmptyState({ title, message, action, icon }: EmptyStateProps) {
  return (
    <div className="panel-inset flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon}
      <p className="type-label">{title}</p>
      <p className="max-w-[26ch] text-sm text-ink-muted">{message}</p>
      {action ? (
        <MechanicalButton size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </MechanicalButton>
      ) : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export function ErrorState({ title = "Signal lost", message, retry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="panel-inset flex flex-col items-center gap-3 border-alert/40 px-6 py-8 text-center"
    >
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: "var(--alert)" }}
      />
      <p className="type-label" style={{ color: "var(--alert)" }}>
        {title}
      </p>
      <p className="max-w-[30ch] text-sm text-ink-muted">{message}</p>
      {retry ? (
        <MechanicalButton size="sm" onClick={retry} className="mt-1">
          Retry
        </MechanicalButton>
      ) : null}
    </div>
  );
}

interface PermissionCardProps {
  title: string;
  explanation: string;
  actionLabel: string;
  onAction: () => void;
  secondary?: { label: string; onClick: () => void };
}

/** Shown before any browser permission prompt, explaining why we ask. */
export function PermissionCard({
  title,
  explanation,
  actionLabel,
  onAction,
  secondary,
}: PermissionCardProps) {
  return (
    <div className="panel flex flex-col gap-4 p-6">
      <p className="type-label">{title}</p>
      <p className="text-sm leading-relaxed text-ink-muted">{explanation}</p>
      <MechanicalButton variant="primary" onClick={onAction}>
        {actionLabel}
      </MechanicalButton>
      {secondary ? (
        <MechanicalButton variant="ghost" size="sm" onClick={secondary.onClick}>
          {secondary.label}
        </MechanicalButton>
      ) : null}
    </div>
  );
}
