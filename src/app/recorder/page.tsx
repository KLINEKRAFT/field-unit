"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ToolScreen } from "@/components/ToolScreen";
import { MechanicalButton } from "@/components/controls";
import { EmptyState, PermissionCard } from "@/components/states";
import { Waveform } from "@/components/Waveform";
import { useRecordings } from "@/lib/stores/recordings";
import { usePrefs } from "@/lib/stores/prefs";
import { recordingRepo } from "@/lib/db";
import { formatBytes, formatDuration, formatRelative } from "@/lib/format";
import { transcribeAudio } from "@/lib/ai/client";
import type { Recording } from "@/lib/types";
import { Mic, Pause, Play, Square, Trash2, Share2, FileText } from "lucide-react";

type RecStatus = "idle" | "denied" | "recording" | "paused";

export default function RecorderPage() {
  const recordings = useRecordings((s) => s.recordings);
  const addRecording = useRecordings((s) => s.add);
  const [status, setStatus] = useState<RecStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const reduced = useReducedMotion();
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [storage, setStorage] = useState<string | null>(null);

  const mediaRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    audioCtx: AudioContext;
    chunks: Blob[];
    startedAt: number;
    pausedMs: number;
    pauseStartedAt: number | null;
  } | null>(null);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((e) => {
        if (e.quota && e.usage !== undefined) {
          setStorage(`${formatBytes(e.usage)} used of ${formatBytes(e.quota)} available`);
        }
      });
    }
  }, [recordings.length]);

  // Elapsed ticker
  useEffect(() => {
    if (status !== "recording") return;
    const id = setInterval(() => {
      const m = mediaRef.current;
      if (m) setElapsed(Date.now() - m.startedAt - m.pausedMs);
    }, 200);
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
      node.fftSize = 256;
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
      };
      setElapsed(0);
      setAnalyser(node);
      setStatus("recording");
    } catch (e) {
      const err = e as DOMException;
      setStatus(err.name === "NotAllowedError" ? "denied" : "idle");
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

  const stop = () => {
    const m = mediaRef.current;
    if (!m) return;
    const duration = Date.now() - m.startedAt - m.pausedMs - (m.pauseStartedAt ? Date.now() - m.pauseStartedAt : 0);
    m.recorder.addEventListener("stop", () => {
      const blob = new Blob(m.chunks, { type: m.recorder.mimeType || "audio/webm" });
      const name = `Recording ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date())}`;
      void addRecording(
        { name, duration, mimeType: blob.type, size: blob.size },
        blob,
      );
      cleanup();
      setStatus("idle");
      setElapsed(0);
    });
    m.recorder.stop();
  };

  const active = status === "recording" || status === "paused";

  return (
    <ToolScreen
      title="Recorder"
      mode={status === "recording" ? "REC" : status === "paused" ? "PAUSED" : "STANDBY"}
      lightOn={status === "recording"}
      lightColor="alert"
    >
      <div className="mx-auto flex max-w-md flex-col gap-5">
        {status === "denied" ? (
          <PermissionCard
            title="Microphone denied"
            explanation="Microphone access was declined. Re-enable it in your browser or iOS settings to record. Audio is stored only on this device."
            actionLabel="Try again"
            onAction={() => void start()}
          />
        ) : (
          <section
            className="flex flex-col items-center gap-6 rounded-[24px] border border-line px-4 py-8"
            style={
              {
                // The tape deck is always instrument-black, in both themes.
                background: "#17150f",
                color: "#d9d2c6",
                "--ink": "#d9d2c6",
                "--ink-muted": "#8b8577",
                "--ink-faint": "#514c40",
                "--surface": "#211e16",
                "--panel": "#211e16",
                "--line": "rgba(217, 210, 198, 0.14)",
                "--line-strong": "rgba(217, 210, 198, 0.34)",
              } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-3">
              <motion.span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: status === "recording" ? "#ed3f1c" : "#514c40" }}
                animate={
                  status === "recording" && !reduced ? { opacity: [1, 0.3, 1] } : { opacity: 1 }
                }
                transition={{ repeat: status === "recording" ? Infinity : 0, duration: 1.1 }}
              />
              <span className="type-label" style={{ color: "#8b8577" }}>
                {status === "recording" ? "Recording" : status === "paused" ? "Paused" : "Ready"}
              </span>
            </div>
            <p className="type-measure segments text-6xl" role="timer">
              {formatDuration(elapsed, active)}
            </p>

            <div className="panel-inset w-full p-3">
              <Waveform analyser={status === "recording" ? analyser : null} height={88} />
            </div>

            <div className="flex items-center gap-4">
              {active && (
                <MechanicalButton
                  ariaLabel={status === "paused" ? "Resume recording" : "Pause recording"}
                  onClick={togglePause}
                  className="h-14 w-14"
                >
                  {status === "paused" ? <Play size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
                </MechanicalButton>
              )}

              {/* Large circular record control */}
              <button
                type="button"
                aria-label={active ? "Stop and save recording" : "Start recording"}
                onClick={active ? stop : () => void start()}
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 transition-transform active:scale-95"
                style={{
                  borderColor: "var(--line-strong)",
                  background: active ? "var(--alert)" : "var(--panel)",
                  boxShadow: "inset 0 1px 0 var(--inset-hi)",
                }}
              >
                {active ? (
                  <Square size={24} fill="white" color="white" aria-hidden />
                ) : (
                  <span
                    aria-hidden
                    className="block h-9 w-9 rounded-full"
                    style={{ background: "var(--alert)" }}
                  />
                )}
              </button>
            </div>

            <p className="type-meta text-center">
              {active
                ? "Recording continues while Field Unit stays open."
                : "Tap the red control to record. iOS will ask for microphone access."}
            </p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="type-label">Archive</h2>
            {storage && <span className="type-meta">{storage}</span>}
          </div>
          {recordings.length === 0 ? (
            <EmptyState
              title="No recordings"
              message="Saved takes appear here with playback, notes and export."
              icon={<Mic size={20} aria-hidden className="text-ink-muted" />}
            />
          ) : (
            recordings.map((r) => <RecordingRow key={r.id} recording={r} />)
          )}
        </section>
      </div>
    </ToolScreen>
  );
}

function RecordingRow({ recording }: { recording: Recording }) {
  const update = useRecordings((s) => s.update);
  const remove = useRecordings((s) => s.remove);
  const aiEnabled = usePrefs((s) => s.prefs.aiEnabled);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!blob) {
      setError("Audio data is missing for this recording.");
      return;
    }
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
        await navigator.share({ files: [file], title: recording.name });
        return;
      } catch {
        /* user cancelled — fall through to download */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const transcribe = async () => {
    setTranscribing(true);
    setError(null);
    try {
      const blob = await recordingRepo.getAudio(recording.id);
      if (!blob) throw new Error("Audio data is missing.");
      const ext = recording.mimeType.includes("mp4") ? "m4a" : "webm";
      const text = await transcribeAudio(blob, `${recording.id}.${ext}`);
      update(recording.id, { transcript: text });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="panel px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? `Stop ${recording.name}` : `Play ${recording.name}`}
          onClick={() => void togglePlay()}
          className="control flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        >
          {playing ? <Square size={16} aria-hidden /> : <Play size={16} aria-hidden className="ml-0.5" />}
        </button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          <p className="truncate text-sm font-semibold">{recording.name}</p>
          <p className="type-meta mt-0.5">
            {formatDuration(recording.duration)} · {formatBytes(recording.size)} ·{" "}
            {formatRelative(recording.createdAt)}
          </p>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          <input
            type="text"
            value={recording.name}
            onChange={(e) => update(recording.id, { name: e.target.value })}
            aria-label="Recording name"
            className="min-h-[44px] rounded-[12px] border border-line bg-surface px-3 text-sm outline-none"
          />
          <textarea
            value={recording.notes ?? ""}
            onChange={(e) => update(recording.id, { notes: e.target.value })}
            placeholder="Notes about this recording"
            aria-label="Recording notes"
            rows={2}
            className="resize-none rounded-[12px] border border-line bg-surface px-3 py-2 text-sm outline-none"
          />
          {recording.transcript && (
            <div className="panel-inset px-3 py-2">
              <p className="type-label pb-1">Transcript</p>
              <p className="whitespace-pre-wrap text-sm">{recording.transcript}</p>
            </div>
          )}
          {error && <p className="text-sm" style={{ color: "var(--alert)" }} role="alert">{error}</p>}
          <div className="flex gap-2">
            <MechanicalButton size="sm" className="flex-1" onClick={() => void share()}>
              <Share2 size={14} aria-hidden /> Export
            </MechanicalButton>
            {aiEnabled && !recording.transcript && (
              <MechanicalButton size="sm" className="flex-1" disabled={transcribing} onClick={() => void transcribe()}>
                <FileText size={14} aria-hidden /> {transcribing ? "Sending…" : "Transcribe"}
              </MechanicalButton>
            )}
            <MechanicalButton size="sm" variant="ghost" ariaLabel="Delete recording" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} aria-hidden style={{ color: "var(--alert)" }} />
            </MechanicalButton>
          </div>
          {aiEnabled && !recording.transcript && (
            <p className="type-meta">Transcription sends this audio to the configured AI provider; it is not stored on the server.</p>
          )}
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
