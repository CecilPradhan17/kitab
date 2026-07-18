"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/features/library/mockBooks";
import BookScene from "./BookScene";
import ExportModal from "@/features/story-export/ExportModal";
import { deleteBook, updateBookQuote } from "./bookDetailApi";

interface BookDetailModalProps {
  /** The book to show, or null when the modal is closed. Driving the modal off
      the selected book itself (rather than a separate boolean) keeps a single
      source of truth — there's no way to be "open" with no book. */
  book: Book | null;
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

/** Format an ISO date (e.g. "2024-05-12") as "May 2024". */
function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Renders the started/finished pair as a single sentence, collapsing the
    redundant parts: same month reads as one date, same year drops the
    repeated year on the start side. Kept local — it's presentation, not
    domain logic. */
function formatReadingRange(startIso: string, finishIso: string): string {
  const start = new Date(startIso);
  const finish = new Date(finishIso);

  const sameMonth =
    start.getFullYear() === finish.getFullYear() &&
    start.getMonth() === finish.getMonth();
  if (sameMonth) return `Read in ${formatMonthYear(finishIso)}`;

  const sameYear = start.getFullYear() === finish.getFullYear();
  if (sameYear) {
    const startMonth = start.toLocaleDateString("en-US", { month: "long" });
    return `${startMonth} – ${formatMonthYear(finishIso)}`;
  }

  return `${formatMonthYear(startIso)} – ${formatMonthYear(finishIso)}`;
}

/** "1st", "2nd", "3rd", "4th", ... — handles the 11th/12th/13th exception. */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// Mirrors server/db/09_quote_length_constraint.sql.
const MAX_QUOTE_LENGTH = 150;

export default function BookDetailModal({
  book,
  isOwner,
  onClose,
  onBookUpdated,
  onBookDeleted,
}: BookDetailModalProps) {
  // Whether the export modal is stacked on top of this detail modal.
  const [exporting, setExporting] = useState(false);

  // Inline quote-editing state.
  const [editingQuote, setEditingQuote] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Inline delete-confirmation state.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Leave edit/confirm modes whenever the shown book changes (switch or close),
  // so neither carries over from one book to another.
  useEffect(() => {
    setEditingQuote(false);
    setQuoteError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
  }, [book?.id]);

  function startEditingQuote() {
    if (!book) return;
    setDraft(book.quote);
    setQuoteError(null);
    setEditingQuote(true);
  }

  async function handleSaveQuote() {
    if (!book) return;
    const trimmed = draft.trim();
    if (trimmed === "") {
      setQuoteError("Quote can't be empty.");
      return;
    }

    setSavingQuote(true);
    setQuoteError(null);
    try {
      const updated = await updateBookQuote(book.id, trimmed);
      // The PATCH response omits bookNumber (it's derived), so keep the book's
      // current number — editing a quote can't change its order anyway.
      onBookUpdated({ ...updated, bookNumber: book.bookNumber });
      setEditingQuote(false);
    } catch {
      setQuoteError("Couldn't save. Please try again.");
    } finally {
      setSavingQuote(false);
    }
  }

  async function handleDelete() {
    if (!book) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteBook(book.id);
      onBookDeleted(); // parent closes this view and refreshes the grid
    } catch {
      setDeleteError("Couldn't delete. Please try again.");
      setDeleting(false);
    }
  }

  // Close on Escape, and lock body scroll while the modal is open. Both effects
  // are keyed on `book` so they only run while something is actually selected.
  useEffect(() => {
    if (!book) return;

    function handleKeyDown(event: KeyboardEvent) {
      // While the export modal is open it owns Escape — closing only that
      // layer — so this one stays put.
      if (exporting) return;
      if (event.key !== "Escape") return;
      // An open editor or a pending delete confirmation owns Escape first —
      // it backs out that step rather than closing the whole modal.
      if (editingQuote) {
        setEditingQuote(false);
        return;
      }
      if (confirmingDelete) {
        setConfirmingDelete(false);
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [book, onClose, exporting, editingQuote, confirmingDelete]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-3xl flex-col gap-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 shadow-2xl shadow-black/80 sm:flex-row sm:gap-10 sm:p-12"
      >
        {/* Close affordance */}
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

        {/* The live 3D book, staged on a soft warm glow — an exhibit under a
            spotlight, not a flat cutout. Keyed on book.id so switching books
            remounts the scene with a fresh texture instead of mutating the
            existing one. The milestone label sits centered above it. */}
        <div className="flex flex-col items-center shrink-0">
          <span className="mb-3 font-sans text-[0.65rem] uppercase tracking-[0.2em] text-accent">
            {ordinal(book.bookNumber)} book {isOwner ? "you've read" : "read"}
          </span>

          <div className="relative aspect-[2/3] w-44 sm:w-72">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[-20%] rounded-full opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse 55% 60% at 50% 45%, rgba(201,151,58,0.18) 0%, rgba(201,151,58,0) 70%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[15%] bottom-[6%] h-6 rounded-full opacity-80 blur-md"
              style={{ background: "rgba(201,151,58,0.35)" }}
            />
            <BookScene key={book.id} book={book} />
          </div>
        </div>

        {/* Metadata, editorial style. Title/author/date are top-anchored and
            Share is the last flex item, so both sit at a fixed height no
            matter what the quote does. The flex-1 middle slot between them
            absorbs all the leftover space and centers the quote inside it
            (vertically + horizontally), so quote length never moves the
            date above it or the Share button below it — Share naturally
            lands level with the delete button, since both sit at the
            bottom of a column stretched to the image's full height. */}
        <div className="flex flex-1 flex-col">
          <h2 className="font-serif text-3xl leading-tight text-foreground">
            {book.title}
          </h2>
          <p className="mt-2 font-sans text-base text-muted">{book.author}</p>

          <p className="mt-7 font-sans text-[0.65rem] uppercase tracking-[0.2em] text-muted">
            {formatReadingRange(book.dateStarted, book.dateFinished)}
          </p>

          <div className="my-8 flex flex-1 flex-col items-center justify-center">
            {editingQuote && isOwner ? (
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center justify-end">
                  <span className="font-sans text-[0.6rem] tracking-[0.1em] text-muted">
                    {draft.length}/{MAX_QUOTE_LENGTH}
                  </span>
                </div>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={6}
                  maxLength={MAX_QUOTE_LENGTH}
                  autoFocus
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-serif text-lg italic leading-relaxed text-foreground/90 outline-none transition-colors focus:border-accent/60"
                />

                {quoteError && (
                  <p className="font-sans text-sm text-red-400/80">{quoteError}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuote(false)}
                    className="inline-flex rounded-full px-4 py-1.5 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuote}
                    disabled={savingQuote}
                    className="inline-flex rounded-full border border-accent/50 px-4 py-1.5 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
                  >
                    {savingQuote ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center">
                <blockquote className="text-center font-serif text-xl italic leading-relaxed text-foreground/90 sm:leading-loose">
                  &ldquo;{book.quote}&rdquo;
                </blockquote>
                {/* Sits in flow right below the quote (so it tracks the quote's
                    height), but slides horizontally onto the same right-4 icon
                    rail as the close and delete buttons: the negative margin
                    cancels the difference between the panel padding (p-8 →
                    32px, sm:p-12 → 48px) and the rail's 16px inset. Same
                    h-9 w-9 hit area as those buttons, so equal right edges
                    mean the icon centers line up exactly. */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={startEditingQuote}
                    aria-label="Edit quote"
                    title="Edit quote"
                    className="-mr-4 mt-3 flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent sm:-mr-8"
                  >
                    <PencilIcon />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Opens the export preview/share modal, stacked on top of this one.
              The one solid-gold element in the modal — this is the pride-to-
              share moment, so it's the loudest thing on screen. The flex-1
              slot above absorbs all leftover height, so this always lands
              at the bottom of the column without needing its own margin.
              Owner-only: sharing a book to a story is an action taken on
              your own library, not something a visitor does on someone
              else's. */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setExporting(true)}
              className="inline-flex self-center rounded-full bg-accent px-5 py-2 font-sans text-[0.65rem] uppercase tracking-[0.2em] text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]"
            >
              Share
            </button>
          )}
        </div>

        {/* Delete affordance — bottom-right corner, below the close button,
            out of the metadata column's reading flow entirely. Confirm step
            opens as a small popover anchored to the same corner since the
            action is destructive and can't be undone. */}
        {isOwner && (
          <div className="absolute bottom-4 right-4">
            {confirmingDelete ? (
              <div className="w-60 rounded-xl border border-white/10 bg-[#161616] p-4 shadow-xl shadow-black/60">
                <p className="font-sans text-xs leading-relaxed text-muted">
                  Remove <span className="text-foreground">{book.title}</span>{" "}
                  from your library? This can&rsquo;t be undone.
                </p>
                {deleteError && (
                  <p className="mt-2 font-sans text-xs text-red-400/80">{deleteError}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex rounded-full border border-red-400/40 px-4 py-1.5 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-red-300/90 outline-none transition-colors hover:bg-red-400/90 hover:text-background focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-red-300/90"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="inline-flex rounded-full px-4 py-1.5 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label="Remove from library"
                title="Remove from library"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-white/5 hover:text-red-300/90 focus-visible:ring-2 focus-visible:ring-accent"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Export modal — a sibling (not a child) of the backdrop so clicks on its
        own backdrop don't bubble up and close this modal too. Driven by
        `exporting`; null when closed. */}
    <ExportModal
      book={exporting ? book : null}
      onClose={() => setExporting(false)}
    />
    </>
  );
}

/** Thin-stroke line icons, sized to match the small icon-only trigger
    buttons. Hand-rolled rather than pulling in an icon library for two
    glyphs — see CLAUDE.md on flagging new dependencies. */
function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 3.5 16.5 6.5 6.5 16.5 3 17l0.5-3.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h12" />
      <path d="M8 6V4.5h4V6" />
      <path d="M5.5 6 6 16.5h8L14.5 6" />
      <path d="M8.5 9v4.5" />
      <path d="M11.5 9v4.5" />
    </svg>
  );
}
