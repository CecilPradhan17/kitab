"use client";

import { useEffect } from "react";
import type { Book } from "@/features/library/mockBooks";
import type { Profile } from "@/features/profile/types";
import ExportCardPanel from "./ExportCardPanel";

interface ExportModalProps {
  /** The book to export, or null when closed — same single-source-of-truth
      pattern as BookDetailModal (no separate "open" boolean). */
  book: Book | null;
  /** The library's owner — passed straight through to StoryExportCard for
      the quote-attribution avatar/name (both the visible preview and the
      hidden full-size capture node need it, so the downloaded PNG matches
      what's shown). */
  profile: Profile;
  onClose: () => void;
}

/** Backdrop/panel chrome, the title, and the close button. All the actual
    per-export content (offscreen 3D render, preview scaling, skeleton,
    capture, Copy/Download) lives in ExportCardPanel, keyed on book.id below
    — same shell/panel split as BookDetailModal/BookDetailPanel, for the
    same reason: a fresh key gives every export clean state with no manual
    reset effect. */
export default function ExportModal({ book, profile, onClose }: ExportModalProps) {
  // Escape closes the export modal. The detail modal underneath suppresses its
  // own Escape handler while this is open, so one press closes one layer.
  useEffect(() => {
    if (!book) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [book, onClose]);

  if (!book) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Export ${book.title}`}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 shadow-2xl shadow-black/80"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden className="text-xl leading-none">
            &times;
          </span>
        </button>

        <h2 className="font-sans text-[0.7rem] uppercase tracking-[0.25em] text-accent">
          Share to story
        </h2>

        <ExportCardPanel key={book.id} book={book} profile={profile} />
      </div>
    </div>
  );
}
