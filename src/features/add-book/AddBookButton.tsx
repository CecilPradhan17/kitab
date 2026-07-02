"use client";

import { useState } from "react";
import AddBookModal from "./AddBookModal";

interface AddBookButtonProps {
  onBookAdded: () => void;
}

/** Self-contained add-book entry point: the trigger button plus the modal it
    opens. Calls onBookAdded (from the home page) after a successful add so the
    page re-fetches the library without needing router.refresh(). */
export default function AddBookButton({ onBookAdded }: AddBookButtonProps) {
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

      <AddBookModal
        open={open}
        onClose={() => setOpen(false)}
        onAdded={() => {
          onBookAdded();
          setOpen(false);
        }}
      />
    </>
  );
}
