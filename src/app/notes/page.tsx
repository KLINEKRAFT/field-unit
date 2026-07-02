"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNotes, sortedNotes } from "@/lib/stores/notes";
import { formatRelative } from "@/lib/format";
import { Pin, Plus, Search, ArrowLeft } from "lucide-react";

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
    <div className="mx-auto max-w-md px-6 pb-8">
      <header className="pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Back to instruments"
            className="-ml-2 flex h-11 w-11 items-center justify-center text-ink"
          >
            <ArrowLeft size={20} strokeWidth={2.2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="New note"
            onClick={newNote}
            className="-mr-2 flex h-11 w-11 items-center justify-center text-ink"
          >
            <Plus size={22} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        <h1 className="type-title pt-1 text-[32px]">Notes</h1>
      </header>

      {/* Borderless search with hairline underline */}
      <div className="mb-4 flex items-center gap-2 hairline-b">
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
        <p className="py-10 text-center text-sm text-ink-muted">
          {query ? "Nothing matches that search." : "No notes."}
        </p>
      ) : (
        <ul>
          {visible.map((n) => (
            <li key={n.id} className="hairline-b last:border-b-0">
              <Link href={`/notes/${n.id}`} className="block py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-bold">{n.title || "Untitled"}</p>
                  {n.pinned && <Pin size={13} aria-label="Pinned" className="shrink-0 text-ink-muted" />}
                </div>
                <p className="type-meta mt-1 line-clamp-2 whitespace-pre-wrap">
                  {n.body || (n.checklist.length > 0 ? `${n.checklist.length} checklist items` : "Empty")}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="type-meta">{formatRelative(n.updatedAt)}</span>
                  {n.tags.map((t) => (
                    <span key={t} className="type-meta uppercase tracking-wide">
                      #{t}
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
