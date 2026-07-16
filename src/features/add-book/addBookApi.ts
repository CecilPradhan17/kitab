import type { Book } from "@/features/library/mockBooks";
import { getStoredToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Mirrors the server's discriminated union (server/src/routes/bookSearch.ts):
// `source` tells the picker which identifier to send back to POST /api/books.
export type BookSearchResult =
  | { source: "openlibrary"; title: string; author: string; isbn: string; coverUrl: string }
  | { source: "custom"; title: string; author: string; customBookId: string; coverUrl: string };

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
  // Exactly one of these, mirroring POST /api/books — set from whichever
  // BookSearchResult the user picked.
  isbn?: string;
  customBookId?: string;
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

interface CustomBookCoverUploadTarget {
  uploadUrl: string;
  key: string;
}

/**
 * Ask Express for a presigned S3 URL to upload a candidate cover for a new
 * custom book. Mirrors requestAvatarUpload() in profileApi.ts — same
 * presigned-direct-to-S3 pattern, different endpoint/purpose.
 */
export async function requestCustomBookCoverUpload(
  token: string,
  file: File
): Promise<CustomBookCoverUploadTarget> {
  const res = await fetch(`${API_URL}/api/custom-books/cover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ contentType: file.type, fileSize: file.size }),
  });

  if (!res.ok) {
    throw new Error(`Failed to request cover upload: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Uploads the file directly to S3 via the presigned URL — never touches Express. */
export async function uploadCustomBookCoverFile(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload file to S3: ${res.status} ${res.statusText}`);
  }
}

/**
 * Confirms a completed S3 cover upload and creates the shared custom_books
 * catalog entry. Call only after uploadCustomBookCoverFile() succeeds.
 */
export async function createCustomBook(
  token: string,
  input: { title: string; author: string; key: string }
): Promise<Extract<BookSearchResult, { source: "custom" }>> {
  const res = await fetch(`${API_URL}/api/custom-books`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Failed to create custom book: ${res.status} ${res.statusText}`);
  }

  const created: { id: string; title: string; author: string; coverUrl: string } = await res.json();
  return {
    source: "custom",
    customBookId: created.id,
    title: created.title,
    author: created.author,
    coverUrl: created.coverUrl,
  };
}
