// Client-side data module for the book-detail view. Runs in the browser (the
// detail modal is a client component), so it uses the NEXT_PUBLIC_ API URL and
// talks to Express directly, like the add-book flow.

import type { Book } from "@/features/library/mockBooks";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Update a book's quote. PATCHes Express and returns the updated book so the
 * caller can sync its local copy. The response omits bookNumber (it's derived),
 * so the caller keeps the book's existing number when merging.
 */
export async function updateBookQuote(
  id: string,
  quote: string
): Promise<Omit<Book, "bookNumber">> {
  const res = await fetch(`${API_URL}/api/books/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quote }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update quote: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Delete a book. The 204 response has no body, so there's nothing to return.
 * The caller closes the detail view and refreshes the grid.
 */
export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/books/${id}`, { method: "DELETE" });

  if (!res.ok) {
    throw new Error(`Failed to delete book: ${res.status} ${res.statusText}`);
  }
}
