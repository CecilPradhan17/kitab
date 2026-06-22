"use client";

import { useEffect } from "react";
import type { Book } from "@/features/library/mockBooks";
import BookScene from "./BookScene";

interface BookDetailModalProps {
  /** The book to show, or null when the modal is closed. Driving the modal off
      the selected book itself (rather than a separate boolean) keeps a single
      source of truth — there's no way to be "open" with no book. */
  book: Book | null;
  onClose: () => void;
}

/** Format an ISO date (e.g. "2024-05-12") as "May 2024" for the editorial
    metadata line. Kept local — it's presentation, not domain logic. */
function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BookDetailModal({ book, onClose }: BookDetailModalProps) {
  // Close on Escape, and lock body scroll while the modal is open. Both effects
  // are keyed on `book` so they only run while something is actually selected.
  useEffect(() => {
    if (!book) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [book, onClose]);

  if (!book) return null;

  return (
    // Backdrop. Clicking it closes; clicking the panel does not (the panel
    // stops propagation). Dialog semantics for assistive tech.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} by ${book.author}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-3xl flex-col gap-10 overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 shadow-2xl shadow-black/80 sm:flex-row sm:p-12"
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

          <blockquote className="mt-8 border-l-2 border-accent/60 pl-5 font-serif text-lg italic leading-relaxed text-foreground/90">
            &ldquo;{book.quote}&rdquo;
          </blockquote>
        </div>
      </div>
    </div>
  );
}
