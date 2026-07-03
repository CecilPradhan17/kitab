"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AddBookModal from "./AddBookModal";

interface AddBookButtonProps {
  onBookAdded: () => void;
}

/** Self-contained add-book entry point: the trigger tile plus the modal it
    opens. Rendered as the first tile in the library grid (owner-only), sized
    to match a book cover's aspect ratio. The modal is portaled to document.body
    so its fixed-position overlay isn't affected by the grid's per-cell sizing
    (or any other ancestor styling) — a modal's placement shouldn't depend on
    where its trigger happens to sit in the tree. Calls onBookAdded after a
    successful add so the parent re-fetches the library. */
export default function AddBookButton({ onBookAdded }: AddBookButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // document.body isn't available during SSR; portal only once mounted.
  useEffect(() => setMounted(true), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add a book"
        className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-accent/40 text-accent outline-none transition-colors hover:border-accent hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden className="text-2xl leading-none">
          +
        </span>
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.2em]">
          Add book
        </span>
      </button>

      {mounted &&
        createPortal(
          <AddBookModal
            open={open}
            onClose={() => setOpen(false)}
            onAdded={() => {
              onBookAdded();
              setOpen(false);
            }}
          />,
          document.body
        )}
    </>
  );
}
