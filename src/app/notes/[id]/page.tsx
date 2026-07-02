"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/stores/notes";
import { useRecordings } from "@/lib/stores/recordings";
import { useEvents } from "@/lib/stores/events";
import { usePrefs } from "@/lib/stores/prefs";
import { uid } from "@/lib/db";
import { formatRelative, formatDateShort } from "@/lib/format";
import { MechanicalButton } from "@/components/controls";
import { AI_ACTIONS, type AIAction } from "@/lib/ai/actions";
import { runAIAction } from "@/lib/ai/client";
import {
  ArrowLeft,
  Pin,
  PinOff,
  Trash2,
  Plus,
  Sparkles,
  Maximize2,
  Minimize2,
  Link2,
  X,
} from "lucide-react";

const NOTE_AI_ACTIONS: AIAction[] = ["summarize", "title", "actionItems", "dates", "tags", "organize"];

export default function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const note = useNotes((s) => s.notes.find((n) => n.id === id));
  const hydrated = useNotes((s) => s.hydrated);
  const update = useNotes((s) => s.update);
  const remove = useNotes((s) => s.remove);
  const aiEnabled = usePrefs((s) => s.prefs.aiEnabled);
  const [focusMode, setFocusMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linking, setLinking] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [checkInput, setCheckInput] = useState("");

  if (!hydrated) {
    return <p className="px-6 py-10 text-sm text-ink-muted">Loading…</p>;
  }
  if (!note) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16">
        <p className="text-sm text-ink-muted">This note no longer exists.</p>
        <MechanicalButton size="sm" onClick={() => router.push("/notes")}>
          Back to notes
        </MechanicalButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-8">
      {!focusMode && (
        <header className="flex items-center justify-between py-2">
          <button
            type="button"
            aria-label="Back to notes"
            onClick={() => router.push("/notes")}
            className="-ml-2 flex h-11 w-11 items-center justify-center text-ink"
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
          <span className="type-meta">Edited {formatRelative(note.updatedAt)} · Local</span>
          <div className="flex">
            <button
              type="button"
              aria-label={note.pinned ? "Unpin note" : "Pin note"}
              onClick={() => update(note.id, { pinned: !note.pinned })}
              className="flex h-11 w-11 items-center justify-center text-ink"
            >
              {note.pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
            </button>
            <button
              type="button"
              aria-label="Delete note"
              onClick={() => setConfirmDelete(true)}
              className="-mr-2 flex h-11 w-11 items-center justify-center"
              style={{ color: "var(--alert)" }}
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        </header>
      )}

      {confirmDelete && (
        <div className="my-3 flex flex-col gap-3 py-2" role="alertdialog" aria-label="Confirm deletion">
          <p className="text-sm">Delete this note permanently?</p>
          <div className="flex gap-2">
            <MechanicalButton variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Keep
            </MechanicalButton>
            <MechanicalButton
              variant="danger"
              className="flex-1"
              onClick={() => {
                remove(note.id);
                router.push("/notes");
              }}
            >
              Delete
            </MechanicalButton>
          </div>
        </div>
      )}

      <input
        type="text"
        value={note.title}
        onChange={(e) => update(note.id, { title: e.target.value })}
        placeholder="Title"
        aria-label="Note title"
        className="type-title mt-2 w-full bg-transparent text-2xl outline-none placeholder:text-ink-faint"
      />

      <textarea
        value={note.body}
        onChange={(e) => update(note.id, { body: e.target.value })}
        placeholder="Write…"
        aria-label="Note body"
        className={`mt-3 w-full flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-ink-faint ${
          focusMode ? "min-h-[70vh]" : "min-h-[30vh]"
        }`}
      />

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setFocusMode(!focusMode)}
          aria-label={focusMode ? "Exit focus mode" : "Focus mode"}
          className="flex h-11 w-11 items-center justify-center text-ink-muted"
        >
          {focusMode ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
        </button>
      </div>

      {!focusMode && (
        <>
          {/* Checklist */}
          <section className="mt-4">
            <h2 className="type-label pb-2">Checklist</h2>
            {note.checklist.map((item) => (
              <div key={item.id} className="flex min-h-[44px] items-center gap-3">
                <input
                  type="checkbox"
                  id={`check-${item.id}`}
                  checked={item.done}
                  onChange={(e) =>
                    update(note.id, {
                      checklist: note.checklist.map((c) =>
                        c.id === item.id ? { ...c, done: e.target.checked } : c,
                      ),
                    })
                  }
                  className="h-5 w-5 accent-[var(--accent)]"
                />
                <label
                  htmlFor={`check-${item.id}`}
                  className={`flex-1 text-sm ${item.done ? "text-ink-muted line-through" : ""}`}
                >
                  {item.text}
                </label>
                <button
                  type="button"
                  aria-label={`Remove ${item.text}`}
                  onClick={() =>
                    update(note.id, { checklist: note.checklist.filter((c) => c.id !== item.id) })
                  }
                  className="flex h-11 w-11 items-center justify-center text-ink-muted"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            ))}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!checkInput.trim()) return;
                update(note.id, {
                  checklist: [...note.checklist, { id: uid(), text: checkInput.trim(), done: false }],
                });
                setCheckInput("");
              }}
            >
              <input
                type="text"
                value={checkInput}
                onChange={(e) => setCheckInput(e.target.value)}
                placeholder="Add item"
                aria-label="Add checklist item"
                className="flat-input flex-1 text-sm"
              />
              <button type="submit" aria-label="Add checklist item" className="flex h-11 w-11 items-center justify-center text-ink">
                <Plus size={18} aria-hidden />
              </button>
            </form>
          </section>

          {/* Tags */}
          <section className="mt-5">
            <h2 className="type-label pb-2">Tags</h2>
            <div className="flex flex-wrap items-center gap-2">
              {note.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-label={`Remove tag ${t}`}
                  onClick={() => update(note.id, { tags: note.tags.filter((x) => x !== t) })}
                  className="flex min-h-[44px] items-center gap-1 text-xs font-bold uppercase tracking-wide text-ink-muted"
                >
                  #{t} <X size={11} aria-hidden />
                </button>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = tagInput.trim().toLowerCase();
                  if (t && !note.tags.includes(t)) update(note.id, { tags: [...note.tags, t] });
                  setTagInput("");
                }}
              >
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="+ tag"
                  aria-label="Add tag"
                  className="flat-input w-24 text-xs"
                />
              </form>
            </div>
          </section>

          {/* Links */}
          <section className="mt-5">
            <div className="flex items-center justify-between pb-2">
              <h2 className="type-label">Linked</h2>
              <MechanicalButton size="sm" variant="ghost" onClick={() => setLinking(!linking)}>
                <Link2 size={14} aria-hidden /> Link
              </MechanicalButton>
            </div>
            <LinkedItems noteId={note.id} recordingId={note.recordingId} eventId={note.eventId} showPicker={linking} onDone={() => setLinking(false)} />
          </section>

          {/* AI */}
          <section className="mt-6">
            <h2 className="type-label pb-2">AI actions</h2>
            {aiEnabled ? (
              <AIPanel noteId={note.id} />
            ) : (
              <p className="text-xs leading-relaxed text-ink-muted">
                AI is switched off. All note features work without it — enable AI in Settings to
                summarize, title, and organize notes via an external provider.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function LinkedItems({
  noteId,
  recordingId,
  eventId,
  showPicker,
  onDone,
}: {
  noteId: string;
  recordingId?: string;
  eventId?: string;
  showPicker: boolean;
  onDone: () => void;
}) {
  const update = useNotes((s) => s.update);
  const recordings = useRecordings((s) => s.recordings);
  const events = useEvents((s) => s.events);
  const recording = recordings.find((r) => r.id === recordingId);
  const event = events.find((e) => e.id === eventId);

  return (
    <div className="flex flex-col gap-1">
      {recording && (
        <div className="flex items-center justify-between text-sm hairline-b py-1">
          <span>🎙 {recording.name}</span>
          <button type="button" aria-label="Unlink recording" onClick={() => update(noteId, { recordingId: undefined })} className="h-11 w-11 text-ink-muted"><X size={14} aria-hidden className="mx-auto" /></button>
        </div>
      )}
      {event && (
        <div className="flex items-center justify-between text-sm hairline-b py-1">
          <span>📅 {event.title} · {formatDateShort(new Date(event.start))}</span>
          <button type="button" aria-label="Unlink event" onClick={() => update(noteId, { eventId: undefined })} className="h-11 w-11 text-ink-muted"><X size={14} aria-hidden className="mx-auto" /></button>
        </div>
      )}
      {!recording && !event && !showPicker && <p className="type-meta">Nothing linked.</p>}
      {showPicker && (
        <div className="flex flex-col gap-1 py-2">
          <p className="type-label">Link a recording</p>
          {recordings.length === 0 && <p className="type-meta">No recordings.</p>}
          {recordings.slice(0, 5).map((r) => (
            <button key={r.id} type="button" className="min-h-[44px] text-left text-sm hairline-b" onClick={() => { update(noteId, { recordingId: r.id }); onDone(); }}>
              {r.name}
            </button>
          ))}
          <p className="type-label mt-3">Link an event</p>
          {events.length === 0 && <p className="type-meta">No events.</p>}
          {events.slice(0, 5).map((e) => (
            <button key={e.id} type="button" className="min-h-[44px] text-left text-sm hairline-b" onClick={() => { update(noteId, { eventId: e.id }); onDone(); }}>
              {e.title} · {formatDateShort(new Date(e.start))}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AIPanel({ noteId }: { noteId: string }) {
  const note = useNotes((s) => s.notes.find((n) => n.id === noteId));
  const update = useNotes((s) => s.update);
  const [busy, setBusy] = useState<AIAction | null>(null);
  const [result, setResult] = useState<{ action: AIAction; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  if (!note) return null;
  const sourceText = `${note.title}\n\n${note.body}`.trim();

  const run = async (action: AIAction) => {
    setBusy(action);
    setError(null);
    setResult(null);
    try {
      const res = await runAIAction(action, sourceText);
      if (!mounted.current) return;
      setResult({ action, text: res.result });
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  const apply = () => {
    if (!result) return;
    switch (result.action) {
      case "title":
        update(noteId, { title: result.text });
        break;
      case "tags":
        update(noteId, {
          tags: Array.from(
            new Set([...note.tags, ...result.text.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)]),
          ),
        });
        break;
      case "organize":
      case "meetingNotes":
        update(noteId, { body: result.text });
        break;
      default:
        update(noteId, { body: `${note.body}\n\n---\n${AI_ACTIONS[result.action]}:\n${result.text}` });
    }
    setResult(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="type-meta flex items-center gap-1.5">
        <Sparkles size={12} aria-hidden />
        Running an action sends this note&apos;s text to the configured AI provider.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {NOTE_AI_ACTIONS.map((a) => (
          <MechanicalButton
            key={a}
            size="sm"
            disabled={busy !== null || sourceText.length === 0}
            onClick={() => void run(a)}
          >
            {busy === a ? "Working…" : AI_ACTIONS[a]}
          </MechanicalButton>
        ))}
      </div>
      {error && <p className="text-sm" style={{ color: "var(--alert)" }} role="alert">{error}</p>}
      {result && (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          <p className="type-label">{AI_ACTIONS[result.action]}</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.text}</p>
          <div className="flex gap-2">
            <MechanicalButton variant="ghost" size="sm" className="flex-1" onClick={() => setResult(null)}>
              Discard
            </MechanicalButton>
            <MechanicalButton variant="primary" size="sm" className="flex-1" onClick={apply}>
              Apply to note
            </MechanicalButton>
          </div>
        </div>
      )}
    </div>
  );
}
