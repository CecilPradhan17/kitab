import type { Book } from "./mockBooks";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Fetch the authenticated user's library. Runs client-side — the home page is
 * a client component since it's always auth-gated and user-specific (no SSR value).
 * The caller is responsible for reading the token from localStorage and redirecting
 * if it's missing; this function just makes the request.
 */
export async function getBooks(token: string): Promise<Book[]> {
  const res = await fetch(`${API_URL}/api/books`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch books: ${res.status} ${res.statusText}`);
  }

  const apiBooks: Omit<Book, "bookNumber">[] = await res.json();
  return apiBooks.map((book, index) => ({ ...book, bookNumber: index + 1 }));
}

/**
 * Fetch a public user's library by username — no auth required.
 * Used by the /[username] profile page (RSC, no token needed).
 */
export async function getPublicBooks(username: string): Promise<Book[]> {
  const API_SERVER = process.env.API_URL ?? "http://localhost:4000";

  const res = await fetch(`${API_SERVER}/api/users/${username}/books`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch books: ${res.status} ${res.statusText}`);
  }

  const apiBooks: Omit<Book, "bookNumber">[] = await res.json();
  return apiBooks.map((book, index) => ({ ...book, bookNumber: index + 1 }));
}
