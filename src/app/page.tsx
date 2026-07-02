"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/features/library/mockBooks";
import LibraryView from "@/features/library/LibraryView";
import AddBookButton from "@/features/add-book/AddBookButton";
import { getBooks } from "@/features/library/booksApi";
import { getStoredToken, clearStoredToken } from "@/lib/auth";

// The home page is always auth-gated and shows the logged-in user's personal
// library — it can never be meaningfully server-rendered, so a client component
// is the right call here. Auth check and book fetch both happen on mount.
export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchBooks = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await getBooks(token);
      setBooks(data);
    } catch {
      // A failed fetch most likely means an expired token — clear and redirect.
      clearStoredToken();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="font-sans text-[0.65rem] uppercase tracking-[0.2em] text-muted">
          Loading…
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 py-16 sm:px-16">
      <header className="mb-12 flex items-start justify-between gap-6">
        <div>
          <p className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-accent">
            The Library
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            Books, read.
          </h1>
        </div>
        <AddBookButton onBookAdded={fetchBooks} />
      </header>

      <LibraryView books={books} onBooksChanged={fetchBooks} />
    </main>
  );
}
