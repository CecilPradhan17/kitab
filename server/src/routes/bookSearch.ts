import { Router } from "express";

/**
 * A single book-search result, trimmed to exactly what the add-book picker
 * needs. This is NOT the full Open Library document (which carries dozens of
 * fields) — the server shapes it down so the client gets a clean, minimal list.
 */
export interface BookSearchResult {
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
}

/**
 * The handful of fields we read off an Open Library search document. Everything
 * is optional and loosely typed because this is an external API we don't
 * control — we validate/narrow each field before using it below.
 */
interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  isbn?: string[];
}

const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";

// How many raw docs to request from Open Library. We over-fetch slightly versus
// what we'll likely show, since some docs get dropped in shaping (no ISBN, etc.).
const SEARCH_LIMIT = 20;

export const bookSearchRouter = Router();

// GET /api/book-search?q=... — proxy Open Library's search, returning a clean
// candidate list for the add-book picker. This is catalog discovery (find a real
// book to add), NOT searching the user's own library.
bookSearchRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (q === "") {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  // Request only the fields we use and cap the count — keeps the upstream
  // payload small before we shape it further.
  const url = new URL(OPEN_LIBRARY_SEARCH);
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "title,author_name,isbn");
  url.searchParams.set("limit", String(SEARCH_LIMIT));

  try {
    const response = await fetch(url, {
      // Open Library asks API clients to identify themselves with a User-Agent.
      headers: { "User-Agent": "Kitab/0.1 (book portfolio project)" },
    });

    if (!response.ok) {
      console.error("Open Library search failed:", response.status, response.statusText);
      // 502: the failure is upstream, not in this request.
      return res.status(502).json({ error: "Book search is unavailable" });
    }

    const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
    const docs = data.docs ?? [];

    // Shape each doc to what the picker needs, dropping anything missing the
    // essentials: a title, an author, and at least one ISBN. No ISBN means no
    // reliable cover and nothing to POST, so such results aren't addable.
    const results: BookSearchResult[] = [];
    for (const doc of docs) {
      const isbn = doc.isbn?.[0];
      const author = doc.author_name?.[0];
      if (!doc.title || !author || !isbn) continue;

      results.push({
        title: doc.title,
        author,
        isbn,
        coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      });
    }

    res.json(results);
  } catch (err) {
    console.error("GET /api/book-search failed:", err);
    res.status(502).json({ error: "Book search is unavailable" });
  }
});
