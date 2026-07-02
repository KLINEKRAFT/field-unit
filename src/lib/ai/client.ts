"use client";

import type { AIAction, AIResponseBody } from "./actions";

/**
 * Client for the serverless AI routes. Nothing is sent anywhere until the
 * user explicitly triggers an action.
 */
export async function runAIAction(action: AIAction, text: string): Promise<AIResponseBody> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, text }),
  });
  const json = (await res.json()) as AIResponseBody & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `AI request failed (${res.status})`);
  return json;
}

export async function getAIStatus(): Promise<{ configured: boolean; provider: string | null }> {
  try {
    const res = await fetch("/api/ai");
    if (!res.ok) return { configured: false, provider: null };
    return (await res.json()) as { configured: boolean; provider: string | null };
  } catch {
    return { configured: false, provider: null };
  }
}

export async function transcribeAudio(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, filename);
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  const json = (await res.json()) as { text?: string; error?: string };
  if (!res.ok || typeof json.text !== "string") {
    throw new Error(json.error ?? `Transcription failed (${res.status})`);
  }
  return json.text;
}
