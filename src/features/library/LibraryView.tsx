"use client";

import { useState } from "react";
import type { Book } from "./mockBooks";
import type { Profile } from "@/features/profile/types";
import LibraryGrid from "./LibraryGrid";
import BookDetailModal from "@/features/book-detail/BookDetailModal";

interface LibraryViewProps {
  books: Book[];
  /** The library's owner — threaded down to the detail modal's story-export
      card, which attributes the shared quote to this profile's name/avatar. */
  profile: Profile;
  /** Whether the current viewer owns this library — gates add/edit/delete
      affordances throughout the grid and detail modal. */
  isOwner: boolean;
  // Called after a book is added, edited, or deleted so the parent can re-fetch.
  onBooksChanged: () => void;
}

/** Client coordinator for the library. Owns the "which book is open" state and
    bridges the (presentational) grid to the (presentational) detail modal, so
    neither of those needs to know about state or each other. */
export default function LibraryView({
  books,
  profile,
  isOwner,
  onBooksChanged,
}: LibraryViewProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Position of the open book within the same ordered list the grid renders
  // — -1 (nothing selected/found) makes hasPrev/hasNext both false, which
  // hides both nav arrows rather than navigating from an unknown position.
  const selectedIndex = selectedBook
    ? books.findIndex((b) => b.id === selectedBook.id)
    : -1;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex !== -1 && selectedIndex < books.length - 1;

  // Stops at the ends rather than wrapping (last -> first) — swiping/
  // clicking past the last book just does nothing, signaled by the arrow
  // being hidden.
  function handleNavigate(direction: "prev" | "next") {
    if (selectedIndex === -1) return;
    const nextIndex = direction === "prev" ? selectedIndex - 1 : selectedIndex + 1;
    const nextBook = books[nextIndex];
    if (nextBook) setSelectedBook(nextBook);
  }

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
        profile={profile}
        isOwner={isOwner}
        onClose={() => setSelectedBook(null)}
        onBookUpdated={handleBookUpdated}
        onBookDeleted={handleBookDeleted}
        onNavigate={handleNavigate}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </>
  );
}
