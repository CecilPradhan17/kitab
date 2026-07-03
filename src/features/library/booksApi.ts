import type { Book } from "./mockBooks";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Fetch a user's library by username — no auth required. Used by the single
 * /[username] page for both the owner and visitors; ownership only gates
 * which UI renders, not which data is fetched.
 */
export async function getPublicBooks(username: string): Promise<Book[]> {
  const res = await fetch(`${API_URL}/api/users/${username}/books`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch books: ${res.status} ${res.statusText}`);
  }

  const apiBooks: Omit<Book, "bookNumber">[] = await res.json();
  return apiBooks.map((book, index) => ({ ...book, bookNumber: index + 1 }));
}
