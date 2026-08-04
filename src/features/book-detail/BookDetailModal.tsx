"use client";

import { useRef, useState } from "react";
import FocusGuard from "@/features/a11y/FocusGuard";
import { useFocusTrap } from "@/features/a11y/useFocusTrap";
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
  /** Move to the neighboring book in the same order the grid renders, via
      swipe or the arrow buttons. The parent (LibraryView) owns the list and
      the "which book is selected" state, so this modal never needs to know
      the book order itself — just which direction was requested. */
  onNavigate: (direction: "prev" | "next") => void;
  /** Whether a prev/next book exists — hides the corresponding arrow at
      either end of the library instead of navigating to nothing. */
  hasPrev: boolean;
  hasNext: boolean;
}

// Swipe past this many px (and more horizontal than vertical, so scrolling
// the panel isn't mistaken for a swipe) to trigger navigation.
const SWIPE_THRESHOLD_PX = 60;

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
  onNavigate,
  hasPrev,
  hasNext,
}: BookDetailModalProps) {
  // Whether the export modal is stacked on top of this detail modal. Lives
  // here (not in BookDetailPanel) since it must survive a book switch and
  // gates the always-rendered ExportModal below.
  const [exporting, setExporting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, { active: book !== null });

  // Only the start point is tracked (not every touchmove) since navigation
  // decides on the total drag at release, not a live-following animation.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    // Require the drag to be more horizontal than vertical, so scrolling the
    // panel's own content never gets mistaken for a swipe.
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }
    // Swipe right (dragging toward the previous book, like flipping back)
    // goes prev; swipe left goes next.
    onNavigate(deltaX > 0 ? "prev" : "next");
  }

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
      <div
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex w-full max-w-3xl max-h-full flex-col overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl shadow-black/80 sm:p-12"
      >
        <FocusGuard position="first" />
        {/* Close affordance — outside BookDetailPanel on purpose: it's modal
            chrome, not book content, so it's clickable immediately rather
            than waiting on the scene. z-20 is required, not decorative: the
            3D viewer's WebGL canvas gets its own browser compositing layer
            and can paint above plain z-auto siblings, which on mobile's
            single-column layout puts it directly under this corner and
            silently swallows taps without an explicit z-index to win against it. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
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

      {/* Nav arrows — siblings of the panel (not inside it), fixed to the
          viewport edges so they stay put regardless of the panel's own
          width, matching a standard lightbox/carousel layout. z-20 for the
          same WebGL-compositing reason as the close button above.
          stopPropagation keeps a click from also closing the modal via the
          backdrop's own onClick. */}
      {hasPrev && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNavigate("prev");
          }}
          aria-label="Previous book"
          className="fixed left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent sm:left-6"
        >
          <ChevronIcon direction="left" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNavigate("next");
          }}
          aria-label="Next book"
          className="fixed right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent sm:right-6"
        >
          <ChevronIcon direction="right" />
        </button>
      )}
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

// Matches BookDetailPanel's icon style (20x20 viewBox, stroke-based, 1.4
// weight, round caps/joins) for visual consistency across the modal.
function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  const points = direction === "left" ? "12 4 6 10 12 16" : "8 4 14 10 8 16";
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points={points} />
    </svg>
  );
}
