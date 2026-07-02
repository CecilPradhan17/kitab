"use client";

import { useState } from "react";
import type { Book } from "./mockBooks";
import LibraryGrid from "./LibraryGrid";
import BookDetailModal from "@/features/book-detail/BookDetailModal";

interface LibraryViewProps {
  books: Book[];
  // Optional: called after a book is edited or deleted so the parent can
  // re-fetch. Not provided on the read-only public profile page.
  onBooksChanged?: () => void;
}

/** Client coordinator for the library. Owns the "which book is open" state and
    bridges the (presentational) grid to the (presentational) detail modal, so
    neither of those needs to know about state or each other. */
export default function LibraryView({ books, onBooksChanged }: LibraryViewProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  function handleBookUpdated(updated: Book) {
    setSelectedBook(updated);
    onBooksChanged?.();
  }

  function handleBookDeleted() {
    setSelectedBook(null);
    onBooksChanged?.();
  }

  return (
    <>
      <LibraryGrid books={books} onSelectBook={setSelectedBook} />
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onBookUpdated={handleBookUpdated}
        onBookDeleted={handleBookDeleted}
      />
    </>
  );
}
