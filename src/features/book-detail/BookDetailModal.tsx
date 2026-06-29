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
  onClose: () => void;
  /** Called with the updated book after an edit (e.g. the quote), so the parent
      can sync its copy and refresh. Keeps this modal from owning library state. */
  onBookUpdated: (book: Book) => void;
  /** Called after a book is deleted, so the parent can close this view and
      refresh the grid (the deleted book is gone, and numbers re-derive). */
  onBookDeleted: () => void;
}

/** Format an ISO date (e.g. "2024-05-12") as "May 2024" for the editorial
    metadata line. Kept local — it's presentation, not domain logic. */
function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BookDetailModal({
  book,
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

        {/* The live 3D book. Keyed on book.id so switching books remounts the
            scene with a fresh texture instead of mutating the existing one. */}
        <div className="relative mx-auto aspect-[2/3] w-48 shrink-0 sm:mx-0">
          <BookScene key={book.id} book={book} />
        </div>

        {/* Metadata, editorial style */}
        <div className="flex flex-1 flex-col">
          <span className="font-sans text-[0.65rem] uppercase tracking-[0.2em] text-accent">
            #{book.bookNumber}
          </span>

          <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground">
            {book.title}
          </h2>
          <p className="mt-1 font-sans text-base text-muted">{book.author}</p>

          <p className="mt-6 font-sans text-[0.65rem] uppercase tracking-[0.2em] text-muted">
            {formatMonthYear(book.dateStarted)} &mdash;{" "}
            {formatMonthYear(book.dateFinished)}
          </p>

          {editingQuote ? (
            <div className="mt-8 flex flex-col gap-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-serif text-lg italic leading-relaxed text-foreground/90 outline-none transition-colors focus:border-accent/60"
              />

              {quoteError && (
                <p className="font-sans text-sm text-red-400/80">{quoteError}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveQuote}
                  disabled={savingQuote}
                  className="inline-flex rounded-full border border-accent/50 px-5 py-2 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
                >
                  {savingQuote ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingQuote(false)}
                  className="inline-flex rounded-full px-5 py-2 font-sans text-xs uppercase tracking-[0.2em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <blockquote className="border-l-2 border-accent/60 pl-5 font-serif text-lg italic leading-relaxed text-foreground/90">
                &ldquo;{book.quote}&rdquo;
              </blockquote>
              <button
                type="button"
                onClick={startEditingQuote}
                className="mt-3 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:text-foreground focus-visible:underline"
              >
                Edit quote
              </button>
            </div>
          )}

          {/* Opens the export preview/share modal, stacked on top of this one. */}
          <button
            type="button"
            onClick={() => setExporting(true)}
            className="mt-8 inline-flex self-start rounded-full border border-accent/50 px-5 py-2.5 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent"
          >
            Share to story
          </button>

          {/* Delete affordance — de-emphasised, with an inline two-step confirm
              since the action is destructive and can't be undone. */}
          <div className="mt-auto pt-8">
            {confirmingDelete ? (
              <div className="flex flex-col gap-3">
                <p className="font-sans text-sm text-muted">
                  Remove <span className="text-foreground">{book.title}</span>{" "}
                  from your library? This can&rsquo;t be undone.
                </p>
                {deleteError && (
                  <p className="font-sans text-sm text-red-400/80">{deleteError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex rounded-full border border-red-400/40 px-5 py-2 font-sans text-xs uppercase tracking-[0.2em] text-red-300/90 outline-none transition-colors hover:bg-red-400/90 hover:text-background focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-red-300/90"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="inline-flex rounded-full px-5 py-2 font-sans text-xs uppercase tracking-[0.2em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="font-sans text-xs uppercase tracking-[0.2em] text-muted outline-none transition-colors hover:text-red-300/90 focus-visible:underline"
              >
                Remove from library
              </button>
            )}
          </div>
        </div>
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
