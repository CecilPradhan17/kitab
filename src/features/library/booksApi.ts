import type { Book } from "./mockBooks";

// Base URL of the Express API. Server-only (no NEXT_PUBLIC_ prefix) because
// getBooks runs on the server in a React Server Component — the request goes
// Next's server -> Express, never from the browser. Falls back to localhost.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Fetch the full library from the API.
 *
 * The single point where the app talks to the books endpoint. Components stay
 * presentational (props in) and never know the data came from here vs. mock
 * data — swapping the source is this one function.
 */
export async function getBooks(): Promise<Book[]> {
  // no-store: always fetch fresh so the grid reflects DB changes immediately.
  const res = await fetch(`${API_URL}/api/books`, { cache: "no-store" });

  if (!res.ok) {
    // Throw loudly rather than returning [] — a failed fetch should surface,
    // not silently render an empty library.
    throw new Error(`Failed to fetch books: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
