"use client";

import { useState } from "react";
import FocusTrap from "focus-trap-react";
import FocusGuard from "@/features/a11y/FocusGuard";
import type { Book } from "@/features/library/mockBooks";
import type { Profile } from "@/features/profile/types";
import BookDetailPanel from "./BookDetailPanel";
import ExportModal from "@/features/story-export/ExportModal";

interface BookDetailModalProps {
  /** The book to show, or null when the modal is closed. Driving the modal off
      the selected book itself (rather than a separate boolean) keeps a single
      source of truth — there's no way to be "open" with no book. */
  book: Book | null;
  /** The library's owner — passed straight through to the story-export card
      (via ExportModal) for the quote-attribution avatar/name. Not used
      elsewhere in this modal. */
  profile: Profile;
  /** Whether the current viewer owns this library. Gates quote editing and
      delete — presentational only, the real check happens on the server when
      these actions hit Express. */
  isOwner: boolean;
  onClose: () => void;
  /** Called with the updated book after an edit (e.g. the quote), so the parent
      can sync its copy and refresh. Keeps this modal from owning library state. */
  onBookUpdated: (book: Book) => void;
  /** Called after a book is deleted, so the parent can close this view and
      refresh the grid (the deleted book is gone, and numbers re-derive). */
  onBookDeleted: () => void;
}

/** Backdrop/panel chrome and the export-modal handoff. All the actual
    per-book content (3D scene, quote editing, delete confirmation, the
    skeleton reveal) lives in BookDetailPanel, keyed on book.id below — that
    key is what gives every book switch fresh state with no manual reset
    effect (see BookDetailPanel's doc comment). */
export default function BookDetailModal({
  book,
  profile,
  isOwner,
  onClose,
  onBookUpdated,
  onBookDeleted,
}: BookDetailModalProps) {
  // Whether the export modal is stacked on top of this detail modal. Lives
  // here (not in BookDetailPanel) since it must survive a book switch and
  // gates the always-rendered ExportModal below.
  const [exporting, setExporting] = useState(false);

  if (!book) return null;

  return (
    <>
    {/* Backdrop. Clicking it closes; clicking the panel does not (the panel
        stops propagation). Dialog semantics for assistive tech. */}
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} by ${book.author}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
    >
      {/* escapeDeactivates: false - Escape is already handled above (and by
          BookDetailPanel's own listener), so the trap only needs to own
          Tab-cycling and returning focus to the trigger button on close. */}
      <FocusTrap focusTrapOptions={{ escapeDeactivates: false }}>
        <div
          onClick={(event) => event.stopPropagation()}
          className="relative flex w-full max-w-3xl max-h-full flex-col overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl shadow-black/80 sm:p-12"
        >
          <FocusGuard position="first" />
          {/* Close affordance — outside BookDetailPanel on purpose: it's modal
              chrome, not book content, so it's clickable immediately rather
              than waiting on the scene. */}
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

          <BookDetailPanel
            key={book.id}
            book={book}
            isOwner={isOwner}
            exporting={exporting}
            onClose={onClose}
            onShare={() => setExporting(true)}
            onBookUpdated={onBookUpdated}
            onBookDeleted={onBookDeleted}
          />
          <FocusGuard position="last" />
        </div>
      </FocusTrap>
    </div>

    {/* Export modal — a sibling (not a child) of the backdrop so clicks on its
        own backdrop don't bubble up and close this modal too. Driven by
        `exporting`; null when closed. */}
    <ExportModal
      book={exporting ? book : null}
      profile={profile}
      onClose={() => setExporting(false)}
    />
    </>
  );
}
