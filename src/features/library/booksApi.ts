import type { Book } from "./mockBooks";
import { getToken } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Fetch the authenticated user's library from the API.
 *
 * Runs server-side in an RSC. Reads the auth token from the httpOnly cookie
 * and forwards it to Express as a Bearer header so requireAuth passes.
 */
export async function getBooks(): Promise<Book[]> {
  const token = await getToken();

  const res = await fetch(`${API_URL}/api/books`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch books: ${res.status} ${res.statusText}`);
  }

  const apiBooks: Omit<Book, "bookNumber">[] = await res.json();
  return apiBooks.map((book, index) => ({ ...book, bookNumber: index + 1 }));
}

/**
 * Fetch a public user's library by username — no auth required.
 * Used by the /[username] profile page for any visitor.
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
