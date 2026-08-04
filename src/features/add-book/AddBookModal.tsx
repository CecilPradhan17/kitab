"use client";

import { useEffect, useRef, useState } from "react";
import FocusGuard from "@/features/a11y/FocusGuard";
import { useFocusTrap } from "@/features/a11y/useFocusTrap";
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

// Mirrors server/db/13_custom_books_length_constraint.sql.
const MAX_TITLE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 100;

export default function AddBookModal({ open, onClose, onAdded }: AddBookModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // initialFocus: false - this modal already autofocuses the search input
  // itself (see inputRef effect below); letting the trap also set initial
  // focus would fight that and land on the Close button instead.
  useFocusTrap(panelRef, { active: open, initialFocus: false });
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
  const [showCustomInfo, setShowCustomInfo] = useState(false);

  // Details-phase form state.
  const [dateStarted, setDateStarted] = useState("");
  const [dateFinished, setDateFinished] = useState("");
  const [quote, setQuote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Dismissing (backdrop click, close button, Escape) while mid-way through
  // the "add manually" form drops back to search instead of closing outright
  // — the form isn't a destination in itself, just a detour on the way to
  // picking a book. Once a custom book has actually been created, `addingCustom`
  // is already false (see handleCreateCustomBook), so dismissing from that
  // point on closes the modal as normal.
  function handleDismiss() {
    if (customSubmitting) return;
    if (addingCustom) {
      setAddingCustom(false);
    } else {
      onClose();
    }
  }

  // Close on Escape and lock body scroll while open — mirrors BookDetailModal.
  // Guarded against customSubmitting the same way AvatarUploadModal guards
  // its own in-flight upload, so an accidental Escape can't abandon it.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleDismiss();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, addingCustom, customSubmitting]);

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
      setShowCustomInfo(false);
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
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setError(err instanceof Error && err.message ? err.message : "Search failed. Please try again.");
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
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong adding the book. Please try again."
      );
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
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : "Couldn't add this book. Please try again.");
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
      onClick={handleDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl shadow-black/80"
      >
        <FocusGuard position="first" />
        {/* Close affordance */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden className="text-xl leading-none">
            &times;
          </span>
        </button>

        {!addingCustom && (
          <p className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-accent">
            Add to library
          </p>
        )}

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
              {/* Stacked on mobile, side by side from sm up - min-w-0 alone
                  let the flex box shrink, but a native date input's own
                  day/month/year rendering has a floor the browser won't
                  compress below, so on a narrow screen it painted past its
                  box into its sibling regardless. Giving each field the
                  full row width on mobile sidesteps that instead of fighting
                  it. */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    Started
                  </span>
                  <input
                    type="date"
                    value={dateStarted}
                    onChange={(event) => setDateStarted(event.target.value)}
                    // min-w-0 + max-w-full + overflow-hidden directly on the
                    // input itself (not just its label): mobile browsers'
                    // native type="date" widget doesn't reliably respect a
                    // percentage width - its calendar-icon/spinner chrome can
                    // claim more horizontal space than the box it's given,
                    // rendering wider than its siblings instead of matching
                    // their right edge. Clipping it to its assigned box
                    // forces it back in line regardless of that intrinsic
                    // sizing quirk.
                    className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-accent/60 [color-scheme:dark]"
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    Finished
                  </span>
                  <input
                    type="date"
                    value={dateFinished}
                    onChange={(event) => setDateFinished(event.target.value)}
                    // min-w-0 + max-w-full + overflow-hidden directly on the
                    // input itself (not just its label): mobile browsers'
                    // native type="date" widget doesn't reliably respect a
                    // percentage width - its calendar-icon/spinner chrome can
                    // claim more horizontal space than the box it's given,
                    // rendering wider than its siblings instead of matching
                    // their right edge. Clipping it to its assigned box
                    // forces it back in line regardless of that intrinsic
                    // sizing quirk.
                    className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-accent/60 [color-scheme:dark]"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    Add your reader&apos;s notes
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
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-serif text-base italic leading-relaxed text-foreground placeholder:not-italic placeholder:font-sans placeholder:text-sm placeholder:text-muted/90 outline-none transition-colors focus:border-accent/60"
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
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl leading-tight text-foreground">
                Add your own book
              </h2>
              <div
                className="relative top-0.5"
                onMouseEnter={() => setShowCustomInfo(true)}
                onMouseLeave={() => setShowCustomInfo(false)}
              >
                <button
                  type="button"
                  onClick={() => setShowCustomInfo((current) => !current)}
                  onFocus={() => setShowCustomInfo(true)}
                  onBlur={() => setShowCustomInfo(false)}
                  aria-expanded={showCustomInfo}
                  aria-label="About adding your own book"
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 font-sans text-[0.55rem] font-bold leading-none text-muted outline-none transition-colors hover:border-white/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                >
                  i
                </button>
                {showCustomInfo && (
                  <div
                    role="tooltip"
                    // Anchored to the icon's right edge (not centered) below
                    // sm - "Add your own book" + the icon nearly fill the
                    // mobile modal's content width, so a centered w-64
                    // tooltip pushed half its width past the panel's right
                    // edge, where overflow-hidden clipped it. Hanging it
                    // from the right edge instead means it only ever extends
                    // left, where the room actually is; max-w caps it for
                    // narrower phones too. Centered-under-icon on sm+ is
                    // unchanged - there's enough room there already.
                    className="absolute right-0 top-full z-10 mt-2.5 w-64 max-w-[calc(100vw-6.5rem)] rounded-lg border border-white/10 bg-[#161616] p-3 font-sans text-xs leading-relaxed text-muted shadow-xl shadow-black/60 sm:left-1/2 sm:right-auto sm:max-w-none sm:-translate-x-1/2"
                  >
                    <span
                      aria-hidden
                      className="absolute -top-1 right-3 h-2 w-2 rotate-45 border-l border-t border-white/10 bg-[#161616] sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
                    />
                    Only add a book if it hasn&rsquo;t been added before, the
                    information is inaccurate, or the cover quality is bad.
                    Other users will be able to find your addition in their
                    search as well.
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleCreateCustomBook} className="mt-6 flex flex-col gap-5">
              <div className="flex gap-4">
                <div className="flex w-[4.7rem] shrink-0 flex-col gap-1.5">
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    Add cover
                  </span>
                  <button
                    type="button"
                    onClick={() => customFileInputRef.current?.click()}
                    disabled={customSubmitting}
                    aria-label={customFile ? "Change cover image" : "Choose cover image"}
                    className="group relative flex-1 w-full overflow-hidden rounded-md text-left outline-none ring-1 ring-white/10 transition-colors hover:ring-accent/50 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {customPreviewUrl ? (
                      <>
                        <img
                          src={customPreviewUrl}
                          alt=""
                          aria-hidden
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="font-sans text-[0.55rem] uppercase tracking-[0.15em] text-white">
                            Change
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/30 text-base text-muted transition-colors group-hover:text-foreground">
                        <span aria-hidden className="leading-none">
                          +
                        </span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                        Title
                      </span>
                      <span className="font-sans text-[0.6rem] tracking-[0.1em] text-muted">
                        {customTitle.length}/{MAX_TITLE_LENGTH}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={MAX_TITLE_LENGTH}
                      value={customTitle}
                      onChange={(event) => setCustomTitle(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors focus:border-accent/60"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                        Author
                      </span>
                      <span className="font-sans text-[0.6rem] tracking-[0.1em] text-muted">
                        {customAuthor.length}/{MAX_AUTHOR_LENGTH}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={MAX_AUTHOR_LENGTH}
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

              {customError && (
                <p className="font-sans text-sm text-red-400/80">{customError}</p>
              )}

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={customSubmitting}
                  className="inline-flex rounded-full border border-accent/50 px-6 py-2.5 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
                >
                  {customSubmitting ? "Adding…" : "Create"}
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
              className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted/90 outline-none transition-colors focus:border-accent/60"
            />

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

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setCustomError(null);
                  setAddingCustom(true);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-4 py-2 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:border-accent/60 hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span aria-hidden className="text-sm leading-none">+</span>
                Add your own book
              </button>
            </div>
          </div>
        )}
        <FocusGuard position="last" />
      </div>
    </div>
  );
}
