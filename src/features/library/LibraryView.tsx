"use client";

import { useState } from "react";
import type { Book } from "./mockBooks";
import LibraryGrid from "./LibraryGrid";
import BookDetailModal from "@/features/book-detail/BookDetailModal";

interface LibraryViewProps {
  books: Book[];
  /** Whether the current viewer owns this library — gates add/edit/delete
      affordances throughout the grid and detail modal. */
  isOwner: boolean;
  // Called after a book is added, edited, or deleted so the parent can re-fetch.
  onBooksChanged: () => void;
}

/** Client coordinator for the library. Owns the "which book is open" state and
    bridges the (presentational) grid to the (presentational) detail modal, so
    neither of those needs to know about state or each other. */
export default function LibraryView({ books, isOwner, onBooksChanged }: LibraryViewProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  function handleBookUpdated(updated: Book) {
    setSelectedBook(updated);
    onBooksChanged();
  }

  function handleBookDeleted() {
    setSelectedBook(null);
    onBooksChanged();
  }

  return (
    <>
      <LibraryGrid
        books={books}
        onSelectBook={setSelectedBook}
        isOwner={isOwner}
        onBookAdded={onBooksChanged}
      />
      <BookDetailModal
        book={selectedBook}
        isOwner={isOwner}
        onClose={() => setSelectedBook(null)}
        onBookUpdated={handleBookUpdated}
        onBookDeleted={handleBookDeleted}
      />
    </>
  );
}
