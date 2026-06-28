// Client-side data module for the book-detail view. Runs in the browser (the
// detail modal is a client component), so it uses the NEXT_PUBLIC_ API URL and
// talks to Express directly, like the add-book flow.

import type { Book } from "@/features/library/mockBooks";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Update a book's quote. PATCHes Express and returns the updated book (in the
 * canonical Book shape) so the caller can sync its local copy.
 */
export async function updateBookQuote(id: string, quote: string): Promise<Book> {
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
