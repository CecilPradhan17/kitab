"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "./mockBooks";
import LibraryGrid from "./LibraryGrid";
import BookDetailModal from "@/features/book-detail/BookDetailModal";

interface LibraryViewProps {
  books: Book[];
}

/** Client coordinator for the library. Owns the "which book is open" state and
    bridges the (presentational) grid to the (presentational) detail modal, so
    neither of those needs to know about state or each other. This is the only
    stateful piece — it can stay a server-rendered page above this boundary. */
export default function LibraryView({ books }: LibraryViewProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const router = useRouter();

  // After an edit, update the open book (so the modal and export card reflect it
  // immediately) and refresh the server data (so the grid is fresh on reopen).
  function handleBookUpdated(updated: Book) {
    setSelectedBook(updated);
    router.refresh();
  }

  // After a delete, close the detail view and refresh so the grid drops the book
  // and the (derived) numbers re-sequence.
  function handleBookDeleted() {
    setSelectedBook(null);
    router.refresh();
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
