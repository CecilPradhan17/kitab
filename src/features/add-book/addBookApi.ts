// Client-side data module for the add-book flow. Unlike booksApi.getBooks
// (which runs server-side in an RSC), these run in the browser — so they use
// the NEXT_PUBLIC_ API URL and talk to Express directly (CORS-enabled there).

import type { Book } from "@/features/library/mockBooks";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** A book-search candidate, matching the shape the /api/book-search proxy
    returns. Defined here (not imported from the server) — the frontend and
    server are separate packages; duplicating the shape is the accepted cost. */
export interface BookSearchResult {
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
}

/**
 * Search the catalog (Open Library, via our proxy) for books to add.
 * Returns candidates the user can pick from. The caller is responsible for
 * debouncing — this fires a request every time it's called.
 */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const res = await fetch(
    `${API_URL}/api/book-search?q=${encodeURIComponent(query)}`
  );

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** What the add-book form sends. The cover URL and book_number aren't here —
    the server derives the cover from the ISBN and auto-assigns the number. */
export interface AddBookInput {
  title: string;
  author: string;
  isbn: string;
  dateStarted: string;
  dateFinished: string;
  quote: string;
}

/**
 * Add a book to the library. POSTs to Express and returns the created book.
 * The response omits bookNumber (it's derived on read), and the caller refreshes
 * the grid rather than using this return value to render — this only persists.
 */
export async function addBook(input: AddBookInput): Promise<Omit<Book, "bookNumber">> {
  const res = await fetch(`${API_URL}/api/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Failed to add book: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
