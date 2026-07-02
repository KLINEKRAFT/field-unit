"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNotes, sortedNotes } from "@/lib/stores/notes";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/states";
import { Pin, Plus, Search } from "lucide-react";

export default function NotesPage() {
  const notes = useNotes((s) => s.notes);
  const create = useNotes((s) => s.create);
  const router = useRouter();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const sorted = sortedNotes(notes);
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, query]);

  const newNote = () => {
    const note = create();
    router.push(`/notes/${note.id}`);
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-8">
      <header className="flex items-center justify-between pb-4 pt-3">
        <h1 className="type-title text-3xl">Notes</h1>
        <button
          type="button"
          aria-label="New note"
          onClick={newNote}
          className="control flex h-11 w-11 items-center justify-center"
        >
          <Plus size={18} aria-hidden />
        </button>
      </header>

      <div className="panel-inset mb-4 flex items-center gap-2 px-3">
        <Search size={16} aria-hidden className="text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes and tags"
          aria-label="Search notes"
          className="min-h-[44px] flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={query ? "No matches" : "No notes"}
          message={query ? "Nothing matches that search." : "Capture a thought — everything stays on this device."}
          action={query ? undefined : { label: "New note", onClick: newNote }}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((n) => (
            <li key={n.id}>
              <Link href={`/notes/${n.id}`} className="panel block px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{n.title || "Untitled"}</p>
                  {n.pinned && <Pin size={13} aria-label="Pinned" className="shrink-0 text-ink-muted" />}
                </div>
                <p className="type-meta mt-1 line-clamp-2 whitespace-pre-wrap">
                  {n.body || (n.checklist.length > 0 ? `${n.checklist.length} checklist items` : "Empty")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="type-meta">{formatRelative(n.updatedAt)}</span>
                  {n.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-[6px] border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
