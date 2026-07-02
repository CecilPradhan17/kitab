import type { Book } from "@/features/library/mockBooks";
import { getStoredToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface BookSearchResult {
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const res = await fetch(
    `${API_URL}/api/book-search?q=${encodeURIComponent(query)}`
  );

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export interface AddBookInput {
  title: string;
  author: string;
  isbn: string;
  dateStarted: string;
  dateFinished: string;
  quote: string;
}

export async function addBook(input: AddBookInput): Promise<Omit<Book, "bookNumber">> {
  const token = getStoredToken();

  const res = await fetch(`${API_URL}/api/books`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Failed to add book: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
