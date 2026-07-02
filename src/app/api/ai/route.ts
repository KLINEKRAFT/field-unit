import { NextResponse } from "next/server";
import { AI_PROMPTS, type AIRequestBody } from "@/lib/ai/actions";
import { getChatProvider } from "@/lib/ai/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_TEXT_LENGTH = 60_000;

export async function POST(request: Request): Promise<NextResponse> {
  let body: AIRequestBody;
  try {
    body = (await request.json()) as AIRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = AI_PROMPTS[body.action];
  if (!prompt) {
    return NextResponse.json({ error: "Unknown AI action." }, { status: 400 });
  }
  if (typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ error: "No text provided." }, { status: 400 });
  }
  if (body.text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "Text is too long for AI processing (60k character limit)." },
      { status: 413 },
    );
  }

  const provider = getChatProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "No AI provider is configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY." },
      { status: 501 },
    );
  }

  try {
    const result = await provider.complete(
      "You are a precise assistant inside a personal notes app. Follow the instruction exactly and return only the requested content.",
      `${prompt}\n\n---\n\n${body.text}`,
    );
    return NextResponse.json({ result, provider: provider.name });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/** Lets the client show provider status without exposing any secrets. */
export async function GET(): Promise<NextResponse> {
  const provider = getChatProvider();
  return NextResponse.json({ configured: provider !== null, provider: provider?.name ?? null });
}
