import { NextResponse } from "next/server";
import { getTranscriptionProvider } from "@/lib/ai/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Whisper's limit is 25 MB; stay under it with a clear client-side error. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Accepts an audio file (multipart form, field "audio") and returns transcript
 * text. Audio is forwarded to the transcription provider and never stored on
 * the server.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const provider = getTranscriptionProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "Transcription is not configured. Set OPENAI_API_KEY to enable it." },
      { status: 501 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'audio' file field." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The audio file is empty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Recording is larger than the 20 MB transcription limit." },
      { status: 413 },
    );
  }

  try {
    const text = await provider.transcribe(file);
    return NextResponse.json({ text, provider: provider.name });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
