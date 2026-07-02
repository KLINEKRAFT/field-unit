"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ToolScreen } from "@/components/ToolScreen";
import { TintablePage } from "@/components/TintablePage";
import { MechanicalButton } from "@/components/controls";
import { Waveform } from "@/components/Waveform";
import { useRecordings } from "@/lib/stores/recordings";
import { usePrefs } from "@/lib/stores/prefs";
import { recordingRepo } from "@/lib/db";
import { formatBytes, formatDuration, formatRelative, pad2 } from "@/lib/format";
import { transcribeAudio } from "@/lib/ai/client";
import type { Recording } from "@/lib/types";
import { Pause, Play, Share2, Square, Trash2 } from "lucide-react";

type RecStatus = "idle" | "denied" | "recording" | "paused";

/** Dark instrument palette — the recorder page is always instrument-black. */
const DARK_VARS = {
  background: "#17150f",
  color: "#d9d2c6",
  "--surface": "#17150f",
  "--panel": "#211e16",
  "--panel-2": "#2b281e",
  "--ink": "#d9d2c6",
  "--ink-muted": "#8b8577",
  "--ink-faint": "#514c40",
  "--line": "rgba(217, 210, 198, 0.14)",
  "--line-strong": "rgba(217, 210, 198, 0.34)",
} as React.CSSProperties;

export default function RecorderPage() {
  const recordings = useRecordings((s) => s.recordings);
  const addRecording = useRecordings((s) => s.add);
  const updateRecording = useRecordings((s) => s.update);
  const aiEnabled = usePrefs((s) => s.prefs.aiEnabled);
  const [status, setStatus] = useState<RecStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const reduced = useReducedMotion();

  const mediaRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    audioCtx: AudioContext;
    chunks: Blob[];
    startedAt: number;
    pausedMs: number;
    pauseStartedAt: number | null;
    cancelled: boolean;
  } | null>(null);

  useEffect(() => {
    if (status !== "recording") return;
    const id = setInterval(() => {
      const m = mediaRef.current;
      if (m) setElapsed(Date.now() - m.startedAt - m.pausedMs);
    }, 100);
    return () => clearInterval(id);
  }, [status]);

  const cleanup = useCallback(() => {
    const m = mediaRef.current;
    if (!m) return;
    m.stream.getTracks().forEach((t) => t.stop());
    void m.audioCtx.close();
    mediaRef.current = null;
    setAnalyser(null);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const memoName = `FIELD MEMO ${pad2(recordings.length + 1).padStart(3, "0")}`;

  const runTranscription = useCallback(
    async (recording: Recording, blob: Blob) => {
      setTranscribingIds((s) => new Set(s).add(recording.id));
      try {
        const ext = recording.mimeType.includes("mp4") ? "m4a" : "webm";
        const text = await transcribeAudio(blob, `${recording.id}.${ext}`);
        updateRecording(recording.id, { transcript: text });
      } catch (e) {
        updateRecording(recording.id, {
          notes: `Transcription failed: ${(e as Error).message}`,
        });
      } finally {
        setTranscribingIds((s) => {
          const next = new Set(s);
          next.delete(recording.id);
          return next;
        });
      }
    },
    [updateRecording],
  );

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const node = audioCtx.createAnalyser();
      node.fftSize = 1024;
      source.connect(node);

      const chunks: Blob[] = [];
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      });
      recorder.start(1000);
      mediaRef.current = {
        recorder,
        stream,
        audioCtx,
        chunks,
        startedAt: Date.now(),
        pausedMs: 0,
        pauseStartedAt: null,
        cancelled: false,
      };
      setElapsed(0);
      setAnalyser(node);
      setStatus("recording");
    } catch (e) {
      setStatus((e as DOMException).name === "NotAllowedError" ? "denied" : "idle");
    }
  };

  const togglePause = () => {
    const m = mediaRef.current;
    if (!m) return;
    if (m.recorder.state === "recording" && typeof m.recorder.pause === "function") {
      m.recorder.pause();
      m.pauseStartedAt = Date.now();
      setStatus("paused");
    } else if (m.recorder.state === "paused") {
      m.recorder.resume();
      if (m.pauseStartedAt) m.pausedMs += Date.now() - m.pauseStartedAt;
      m.pauseStartedAt = null;
      setStatus("recording");
    }
  };

  const finish = (cancel: boolean) => {
    const m = mediaRef.current;
    if (!m) return;
    m.cancelled = cancel;
    const duration =
      Date.now() - m.startedAt - m.pausedMs - (m.pauseStartedAt ? Date.now() - m.pauseStartedAt : 0);
    m.recorder.addEventListener("stop", () => {
      if (!m.cancelled) {
        const blob = new Blob(m.chunks, { type: m.recorder.mimeType || "audio/webm" });
        void addRecording(
          { name: memoName, duration, mimeType: blob.type, size: blob.size },
          blob,
        ).then((recording) => {
          // Scribe behavior: transcribe automatically when AI is enabled.
          if (aiEnabled) void runTranscription(recording, blob);
        });
      }
      cleanup();
      setStatus("idle");
      setElapsed(0);
    });
    m.recorder.stop();
  };

  const active = status === "recording" || status === "paused";

  return (
    <TintablePage page="recorder" defaultVars={DARK_VARS}>
      <ToolScreen
        title="Recorder"
        mode={status === "recording" ? "REC" : status === "paused" ? "PAUSED" : "LOCAL"}
        lightOn={status === "recording"}
        lightColor="alert"
      >
        <div className="mx-auto flex max-w-md flex-col gap-6">
          {status === "denied" ? (
            <div className="flex flex-col gap-4 py-4">
              <p className="type-label">Microphone denied</p>
              <p className="text-sm leading-relaxed text-ink-muted">
                Microphone access was declined. Re-enable it in your browser or iOS settings to
                record. Audio is stored only on this device.
              </p>
              <MechanicalButton variant="primary" onClick={() => void start()}>
                Try again
              </MechanicalButton>
            </div>
          ) : (
            <section className="flex flex-col items-center gap-5">
              <p className="type-label">{active ? memoName : "Ready"}</p>
              <p className="type-measure segments text-[56px]" role="timer">
                {formatDuration(elapsed, active)}
              </p>
              <div className="flex items-center gap-2">
                <motion.span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: status === "recording" ? "#ed3f1c" : "var(--ink-faint)" }}
                  animate={
                    status === "recording" && !reduced ? { opacity: [1, 0.3, 1] } : { opacity: 1 }
                  }
                  transition={{ repeat: status === "recording" ? Infinity : 0, duration: 1.1 }}
                />
                <span className="type-label">
                  {status === "recording"
                    ? "Recording"
                    : status === "paused"
                      ? "Paused"
                      : "Standing by"}
                </span>
              </div>

              <div className="w-full">
                <Waveform analyser={status === "recording" ? analyser : null} height={130} />
              </div>

              {/* Transport */}
              <div className="flex items-center gap-5">
                {active && (
                  <button
                    type="button"
                    aria-label={status === "paused" ? "Resume" : "Pause"}
                    onClick={togglePause}
                    className="flex h-14 w-14 items-center justify-center rounded-full border"
                    style={{ borderColor: "var(--line-strong)" }}
                  >
                    {status === "paused" ? <Play size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={active ? "Stop and save recording" : "Start recording"}
                  onClick={active ? () => finish(false) : () => void start()}
                  className="flex h-20 w-20 items-center justify-center rounded-full border-2 transition-transform active:scale-95"
                  style={{
                    borderColor: "var(--line-strong)",
                    background: active ? "#bf1b1b" : "transparent",
                  }}
                >
                  {active ? (
                    <Square size={24} fill="var(--ink)" color="var(--ink)" aria-hidden />
                  ) : (
                    <span aria-hidden className="block h-9 w-9 rounded-full" style={{ background: "var(--alert)" }} />
                  )}
                </button>
                {active && (
                  <button
                    type="button"
                    aria-label="Cancel recording"
                    onClick={() => finish(true)}
                    className="flex h-14 w-14 items-center justify-center rounded-full border text-xs font-bold uppercase tracking-wide"
                    style={{ borderColor: "var(--line-strong)", color: "var(--ink-muted)" }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <p className="type-meta text-center">
                {aiEnabled
                  ? "Saved takes are transcribed automatically via the AI provider."
                  : "Enable AI in Settings for automatic transcription."}
              </p>
            </section>
          )}

          {/* Archive */}
          <section className="pt-2">
            <div className="flex items-baseline justify-between hairline-b pb-2">
              <h2 className="type-label">Archive</h2>
              <span className="type-meta">{recordings.length} takes</span>
            </div>
            {recordings.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No recordings yet.</p>
            ) : (
              recordings.map((r) => (
                <ArchiveRow
                  key={r.id}
                  recording={r}
                  transcribing={transcribingIds.has(r.id)}
                  aiEnabled={aiEnabled}
                  onTranscribe={async () => {
                    const blob = await recordingRepo.getAudio(r.id);
                    if (blob) void runTranscription(r, blob);
                  }}
                />
              ))
            )}
          </section>
        </div>
      </ToolScreen>
    </TintablePage>
  );
}

function ArchiveRow({
  recording,
  transcribing,
  aiEnabled,
  onTranscribe,
}: {
  recording: Recording;
  transcribing: boolean;
  aiEnabled: boolean;
  onTranscribe: () => void;
}) {
  const update = useRecordings((s) => s.update);
  const remove = useRecordings((s) => s.remove);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const releaseAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => releaseAudio, [releaseAudio]);

  const togglePlay = async () => {
    if (playing) {
      releaseAudio();
      return;
    }
    const blob = await recordingRepo.getAudio(recording.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    urlRef.current = url;
    audioRef.current = audio;
    audio.addEventListener("ended", releaseAudio);
    void audio.play();
    setPlaying(true);
  };

  const share = async () => {
    const blob = await recordingRepo.getAudio(recording.id);
    if (!blob) return;
    const ext = recording.mimeType.includes("mp4") ? "m4a" : "webm";
    const file = new File([blob], `${recording.name}.${ext}`, { type: recording.mimeType });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: recording.name, text: recording.transcript });
        return;
      } catch {
        /* cancelled — fall through to download */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="hairline-b py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? `Stop ${recording.name}` : `Play ${recording.name}`}
          onClick={() => void togglePlay()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--line-strong)" }}
        >
          {playing ? <Square size={14} aria-hidden /> : <Play size={14} aria-hidden className="ml-0.5" />}
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <p className="truncate text-sm font-bold uppercase tracking-[0.04em]">{recording.name}</p>
          <p className="type-meta mt-0.5">
            {formatDuration(recording.duration)} · {formatRelative(recording.createdAt)}
            {transcribing ? " · Transcribing…" : ""}
          </p>
          {!expanded && recording.transcript && (
            <p className="type-meta mt-1 line-clamp-2 normal-case">{recording.transcript}</p>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 pl-14">
          <input
            type="text"
            value={recording.name}
            onChange={(e) => update(recording.id, { name: e.target.value })}
            aria-label="Recording name"
            className="flat-input w-full text-sm font-bold uppercase tracking-[0.04em]"
          />
          {recording.transcript ? (
            <div>
              <p className="type-label pb-1">Transcript</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{recording.transcript}</p>
            </div>
          ) : transcribing ? (
            <p className="type-meta">Transcribing…</p>
          ) : aiEnabled ? (
            <MechanicalButton size="sm" onClick={onTranscribe}>
              Transcribe
            </MechanicalButton>
          ) : (
            <p className="type-meta">Enable AI in Settings to transcribe this take.</p>
          )}
          {recording.notes && <p className="type-meta">{recording.notes}</p>}
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => void share()} aria-label="Export recording" className="flex h-11 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">
              <Share2 size={13} aria-hidden /> Export
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete recording"
              className="flex h-11 items-center gap-1.5 text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--alert)" }}
            >
              <Trash2 size={13} aria-hidden /> Delete
            </button>
            <span className="type-meta ml-auto">{formatBytes(recording.size)}</span>
          </div>
          {confirmDelete && (
            <div className="flex gap-2" role="alertdialog" aria-label="Confirm delete recording">
              <MechanicalButton size="sm" variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Keep
              </MechanicalButton>
              <MechanicalButton
                size="sm"
                variant="danger"
                className="flex-1"
                onClick={() => {
                  releaseAudio();
                  remove(recording.id);
                }}
              >
                Delete forever
              </MechanicalButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
