import type { Book } from "@/features/library/mockBooks";
import { getStoredToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function updateBookQuote(
  id: string,
  quote: string
): Promise<Omit<Book, "bookNumber">> {
  const token = getStoredToken();

  const res = await fetch(`${API_URL}/api/books/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ quote }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update quote: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function deleteBook(id: string): Promise<void> {
  const token = getStoredToken();

  const res = await fetch(`${API_URL}/api/books/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`Failed to delete book: ${res.status} ${res.statusText}`);
  }
}
