"use client";

import { useState } from "react";
import AddBookModal from "./AddBookModal";

/** Self-contained add-book entry point: the trigger button plus the modal it
    opens. Kept separate from LibraryView so the add flow doesn't entangle with
    the "which book is selected" state — it just opens, adds, and (in 3b) tells
    the page to refresh. */
export default function AddBookButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-accent/50 px-5 py-2.5 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden className="text-base leading-none">
          +
        </span>
        Add book
      </button>

      <AddBookModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
