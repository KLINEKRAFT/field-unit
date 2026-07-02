/**
 * Server-only AI provider abstraction. Keys never reach the client.
 * Providers are plain fetch calls so no SDK dependency is needed and
 * the provider can be swapped by implementing `ChatProvider`.
 */

export interface ChatProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(system: string, user: string): Promise<string>;
}

const anthropicProvider: ChatProvider = {
  name: "anthropic",
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async complete(system, user) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return json.content.find((c) => c.type === "text")?.text?.trim() ?? "";
  },
};

const openaiProvider: ChatProvider = {
  name: "openai",
  isConfigured: () => Boolean(process.env.OPENAI_API_KEY),
  async complete(system, user) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        max_tokens: 1024,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return json.choices[0]?.message.content.trim() ?? "";
  },
};

export function getChatProvider(): ChatProvider | null {
  const preferred = process.env.AI_PROVIDER;
  const providers =
    preferred === "openai" ? [openaiProvider, anthropicProvider] : [anthropicProvider, openaiProvider];
  return providers.find((p) => p.isConfigured()) ?? null;
}

export interface TranscriptionProvider {
  readonly name: string;
  isConfigured(): boolean;
  transcribe(file: File): Promise<string>;
}

export const whisperProvider: TranscriptionProvider = {
  name: "openai-whisper",
  isConfigured: () => Boolean(process.env.OPENAI_API_KEY),
  async transcribe(file) {
    const form = new FormData();
    form.append("file", file, file.name || "recording.webm");
    form.append("model", "whisper-1");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Transcription error ${res.status}`);
    const json = (await res.json()) as { text: string };
    return json.text;
  },
};

export function getTranscriptionProvider(): TranscriptionProvider | null {
  return whisperProvider.isConfigured() ? whisperProvider : null;
}
