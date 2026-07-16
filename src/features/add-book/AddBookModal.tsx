"use client";

import { useEffect, useRef, useState } from "react";
import {
  addBook,
  searchBooks,
  requestCustomBookCoverUpload,
  uploadCustomBookCoverFile,
  createCustomBook,
  type BookSearchResult,
} from "./addBookApi";
import { getStoredToken } from "@/lib/auth";

interface AddBookModalProps {
  /** Whether the modal is open. Driven by the parent (AddBookButton). */
  open: boolean;
  onClose: () => void;
  /** Called after a book is successfully added, so the parent can refresh the
      (server-rendered) grid. The modal itself stays unaware of how data loads. */
  onAdded: () => void;
}

// Wait this long after the last keystroke before searching, so typing a query
// fires one request instead of one per character.
const SEARCH_DEBOUNCE_MS = 300;

// Ignore queries shorter than this — too broad to be useful, and avoids
// hammering the API on the first character or two.
const MIN_QUERY_LENGTH = 2;

// Mirrors the server-side limits (server/src/routes/customBooks.ts) — this is
// just for fast feedback before a network round-trip; the server is the real check.
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5MB

// Mirrors server/db/09_quote_length_constraint.sql.
const MAX_QUOTE_LENGTH = 150;

export default function AddBookModal({ open, onClose, onAdded }: AddBookModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The book the user picked from search results (or just created via the
  // "add manually" form). null = still in search phase.
  const [selected, setSelected] = useState<BookSearchResult | null>(null);

  // "Add manually" phase — a sibling of the search phase, entered from it and
  // exited either back to search or forward into the details phase (by
  // setting `selected` once the custom book is created).
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customAuthor, setCustomAuthor] = useState("");
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Details-phase form state.
  const [dateStarted, setDateStarted] = useState("");
  const [dateFinished, setDateFinished] = useState("");
  const [quote, setQuote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Close on Escape and lock body scroll while open — mirrors BookDetailModal.
  // Guarded against customSubmitting the same way AvatarUploadModal guards
  // its own in-flight upload, so an accidental Escape can't abandon it.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !customSubmitting) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, customSubmitting]);

  // Reset all state whenever the modal closes, so it opens fresh next time.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearching(false);
      setError(null);
      setSelected(null);
      setAddingCustom(false);
      setCustomTitle("");
      setCustomAuthor("");
      setCustomFile(null);
      setCustomPreviewUrl(null);
      setCustomSubmitting(false);
      setCustomError(null);
      setDateStarted("");
      setDateFinished("");
      setQuote("");
      setSubmitting(false);
      setSubmitError(null);
    }
  }, [open]);

  // Avoid leaking the local blob URL once it's replaced or the modal closes.
  useEffect(() => {
    return () => {
      if (customPreviewUrl) URL.revokeObjectURL(customPreviewUrl);
    };
  }, [customPreviewUrl]);

  // Debounced search. Re-runs on every keystroke but only the last one in a
  // 300ms window actually fetches; `cancelled` ignores a stale response that
  // resolves after the query has moved on.
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const found = await searchBooks(trimmed);
        if (!cancelled) {
          setResults(found);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setError("Search failed. Please try again.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Autofocus the search input when the modal opens (search phase only).
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open && !selected) inputRef.current?.focus();
  }, [open, selected]);

  const customFileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    // Client-side validation mirroring the server's: all fields required and
    // finished can't precede started. The server validates again regardless —
    // this just gives instant feedback without a round-trip.
    if (!dateStarted || !dateFinished || quote.trim() === "") {
      setSubmitError("Please fill in both dates and a quote.");
      return;
    }
    if (dateFinished < dateStarted) {
      setSubmitError("Finished date can't be before the started date.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await addBook({
        title: selected.title,
        author: selected.author,
        isbn: selected.source === "openlibrary" ? selected.isbn : undefined,
        customBookId: selected.source === "custom" ? selected.customBookId : undefined,
        dateStarted,
        dateFinished,
        quote: quote.trim(),
      });
      onAdded(); // refresh the grid
      onClose(); // and dismiss (which also resets all state)
    } catch {
      setSubmitError("Something went wrong adding the book. Please try again.");
      setSubmitting(false);
    }
  }

  function handleCustomFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setCustomError(null);

    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      setCustomError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setCustomError("Image must be smaller than 5MB.");
      return;
    }

    if (customPreviewUrl) URL.revokeObjectURL(customPreviewUrl);
    setCustomFile(file);
    setCustomPreviewUrl(URL.createObjectURL(file));
  }

  async function handleCreateCustomBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (customTitle.trim() === "" || customAuthor.trim() === "" || !customFile) {
      setCustomError("Please provide a title, author, and cover image.");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setCustomError("You need to be signed in to do that.");
      return;
    }

    setCustomSubmitting(true);
    setCustomError(null);
    try {
      const { uploadUrl, key } = await requestCustomBookCoverUpload(token, customFile);
      await uploadCustomBookCoverFile(uploadUrl, customFile);
      const created = await createCustomBook(token, {
        title: customTitle.trim(),
        author: customAuthor.trim(),
        key,
      });
      setAddingCustom(false);
      setSelected(created); // hands off into the existing details phase
    } catch {
      setCustomError("Couldn't add this book. Please try again.");
    } finally {
      setCustomSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a book"
      onClick={() => !customSubmitting && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl shadow-black/80"
      >
        {/* Close affordance */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden className="text-xl leading-none">
            &times;
          </span>
        </button>

        <p className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-accent">
          Add to library
        </p>

        {selected ? (
          /* ---- Details phase (form lands in 3b) ---- */
          <div className="mt-4 flex flex-col">
            <div className="flex gap-4">
              <img
                src={selected.coverUrl}
                alt={`Cover of ${selected.title}`}
                className="h-28 w-[4.7rem] shrink-0 rounded-md object-cover ring-1 ring-white/10"
              />
              <div className="flex flex-col">
                <h2 className="font-serif text-2xl leading-tight text-foreground">
                  {selected.title}
                </h2>
                <p className="mt-1 font-sans text-sm text-muted">
                  {selected.author}
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mt-3 self-start font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:text-foreground focus-visible:underline"
                >
                  ← Change book
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              <div className="flex gap-4">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    Started
                  </span>
                  <input
                    type="date"
                    value={dateStarted}
                    onChange={(event) => setDateStarted(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-accent/60 [color-scheme:dark]"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    Finished
                  </span>
                  <input
                    type="date"
                    value={dateFinished}
                    onChange={(event) => setDateFinished(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-accent/60 [color-scheme:dark]"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    Quote
                  </span>
                  <span className="font-sans text-[0.6rem] tracking-[0.1em] text-muted">
                    {quote.length}/{MAX_QUOTE_LENGTH}
                  </span>
                </div>
                <textarea
                  value={quote}
                  onChange={(event) => setQuote(event.target.value)}
                  rows={3}
                  maxLength={MAX_QUOTE_LENGTH}
                  placeholder="A line worth remembering…"
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-serif text-base italic leading-relaxed text-foreground placeholder:not-italic placeholder:font-sans placeholder:text-sm placeholder:text-muted/60 outline-none transition-colors focus:border-accent/60"
                />
              </label>

              {submitError && (
                <p className="font-sans text-sm text-red-400/80">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 inline-flex self-start rounded-full border border-accent/50 px-6 py-2.5 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
              >
                {submitting ? "Adding…" : "Add to library"}
              </button>
            </form>
          </div>
        ) : addingCustom ? (
          /* ---- Add-manually phase ---- */
          <div className="mt-4 flex min-h-0 flex-col">
            <h2 className="font-serif text-2xl leading-tight text-foreground">
              Add a book
            </h2>
            <p className="mt-1 font-sans text-xs text-muted">
              This gets added to a shared catalog — other people will find it
              in search too.
            </p>

            <form onSubmit={handleCreateCustomBook} className="mt-6 flex flex-col gap-5">
              <div className="flex gap-4">
                <div className="h-28 w-[4.7rem] shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
                  {customPreviewUrl ? (
                    <img
                      src={customPreviewUrl}
                      alt=""
                      aria-hidden
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/30 font-sans text-[0.55rem] uppercase tracking-[0.15em] text-muted">
                      No cover
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                      Title
                    </span>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(event) => setCustomTitle(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors focus:border-accent/60"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                      Author
                    </span>
                    <input
                      type="text"
                      value={customAuthor}
                      onChange={(event) => setCustomAuthor(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors focus:border-accent/60"
                    />
                  </label>
                </div>
              </div>

              <input
                ref={customFileInputRef}
                type="file"
                accept={ALLOWED_COVER_TYPES.join(",")}
                onChange={handleCustomFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => customFileInputRef.current?.click()}
                disabled={customSubmitting}
                className="inline-flex self-start rounded-full border border-white/15 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.2em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {customFile ? "Change cover" : "Choose cover image"}
              </button>

              {customError && (
                <p className="font-sans text-sm text-red-400/80">{customError}</p>
              )}

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={customSubmitting}
                  className="inline-flex self-start rounded-full border border-accent/50 px-6 py-2.5 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
                >
                  {customSubmitting ? "Adding…" : "Continue"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingCustom(false)}
                  disabled={customSubmitting}
                  className="font-sans text-xs uppercase tracking-[0.2em] text-muted outline-none transition-colors hover:text-foreground focus-visible:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Back to search
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ---- Search phase ---- */
          <div className="mt-4 flex min-h-0 flex-col">
            <h2 className="font-serif text-2xl leading-tight text-foreground">
              Find a book
            </h2>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title or author…"
              className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-accent/60"
            />

            <button
              type="button"
              onClick={() => setAddingCustom(true)}
              className="mt-2 self-start font-sans text-xs text-muted outline-none transition-colors hover:text-accent focus-visible:underline"
            >
              Can&rsquo;t find it? Add it manually
            </button>

            {/* Results / status region */}
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {searching && (
                <p className="font-sans text-sm text-muted">Searching…</p>
              )}

              {error && !searching && (
                <p className="font-sans text-sm text-red-400/80">{error}</p>
              )}

              {!searching &&
                !error &&
                query.trim().length >= MIN_QUERY_LENGTH &&
                results.length === 0 && (
                  <p className="font-sans text-sm text-muted">
                    No matches found.
                  </p>
                )}

              <ul className="flex flex-col gap-1">
                {results.map((result) => {
                  const key =
                    result.source === "custom" ? result.customBookId : result.isbn;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setSelected(result)}
                        className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors focus-visible:bg-white/5 ${
                          result.source === "custom"
                            ? "bg-accent/10 hover:bg-accent/15"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div className="h-10 w-[1.67rem] shrink-0 flex-none overflow-hidden rounded ring-1 ring-white/10">
                          <img
                            src={result.coverUrl}
                            alt=""
                            aria-hidden
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-serif text-sm text-foreground">
                            {result.title}
                          </span>
                          <span className="truncate font-sans text-xs text-muted">
                            {result.author}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
