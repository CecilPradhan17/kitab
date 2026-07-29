"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/features/library/mockBooks";
import BookScene from "./BookScene";
import BookDetailSkeleton from "./BookDetailSkeleton";
import { deleteBook, updateBookQuote } from "./bookDetailApi";

interface BookDetailPanelProps {
  /** Always defined — BookDetailModal only ever mounts this (keyed on
      book.id) once a book is actually selected. Keying on book.id is what
      resets all of this component's state on every book switch: React
      unmounts the old instance and mounts a fresh one, so sceneReady,
      editingQuote, etc. all start at their initial values again with no
      effect required. */
  book: Book;
  /** Whether the current viewer owns this library. Gates quote editing and
      delete — presentational only, the real check happens on the server when
      these actions hit Express. */
  isOwner: boolean;
  /** Whether the export modal (owned by the parent shell) is open. While
      true, this panel's own Escape handling stays out of the way entirely —
      ExportModal owns Escape exclusively at that point. */
  exporting: boolean;
  onClose: () => void;
  onShare: () => void;
  /** Called with the updated book after an edit (e.g. the quote), so the parent
      can sync its copy and refresh. Keeps this modal from owning library state. */
  onBookUpdated: (book: Book) => void;
  /** Called after a book is deleted, so the parent can close this view and
      refresh the grid (the deleted book is gone, and numbers re-derive). */
  onBookDeleted: () => void;
}

/** Format an ISO date (e.g. "2024-05-12") as "May 2024". */
function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Renders the started/finished pair as a single sentence, collapsing the
    redundant parts: same month reads as one date, same year drops the
    repeated year on the start side. Kept local — it's presentation, not
    domain logic. */
function formatReadingRange(startIso: string, finishIso: string): string {
  const start = new Date(startIso);
  const finish = new Date(finishIso);

  const sameMonth =
    start.getFullYear() === finish.getFullYear() &&
    start.getMonth() === finish.getMonth();
  if (sameMonth) return `Read in ${formatMonthYear(finishIso)}`;

  const sameYear = start.getFullYear() === finish.getFullYear();
  if (sameYear) {
    const startMonth = start.toLocaleDateString("en-US", { month: "long" });
    return `${startMonth} – ${formatMonthYear(finishIso)}`;
  }

  return `${formatMonthYear(startIso)} – ${formatMonthYear(finishIso)}`;
}

/** "1st", "2nd", "3rd", "4th", ... — handles the 11th/12th/13th exception. */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// Mirrors server/db/09_quote_length_constraint.sql.
const MAX_QUOTE_LENGTH = 150;

/** The book detail modal's actual content: 3D scene, title/author/date,
    quote (editable by the owner), Share trigger, and delete affordance.
    Split out from BookDetailModal so it can be keyed on book.id there —
    that's what resets sceneReady/editingQuote/confirmingDelete/etc. on every
    book switch, instead of a useEffect manually resetting five pieces of
    state (which the react-hooks/set-state-in-effect lint rule flags: calling
    setState synchronously in an effect causes an extra render pass React's
    own docs recommend avoiding via exactly this key-to-remount pattern). */
export default function BookDetailPanel({
  book,
  isOwner,
  exporting,
  onClose,
  onShare,
  onBookUpdated,
  onBookDeleted,
}: BookDetailPanelProps) {
  // Whether the 3D scene's cover texture has finished loading. Gates a
  // coordinated reveal (see the render below): the skeleton covers the real
  // content — which is already mounted and loading in the background, just
  // invisible — until this flips true, at which point the 3D model and all
  // text/metadata fade in together in one transition. Never partially true.
  const [sceneReady, setSceneReady] = useState(false);

  // Inline quote-editing state.
  const [editingQuote, setEditingQuote] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Inline delete-confirmation state.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startEditingQuote() {
    setDraft(book.quote);
    setQuoteError(null);
    setEditingQuote(true);
  }

  async function handleSaveQuote() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setQuoteError("Quote can't be empty.");
      return;
    }

    setSavingQuote(true);
    setQuoteError(null);
    try {
      const updated = await updateBookQuote(book.id, trimmed);
      // The PATCH response omits bookNumber (it's derived), so keep the book's
      // current number — editing a quote can't change its order anyway.
      onBookUpdated({ ...updated, bookNumber: book.bookNumber });
      setEditingQuote(false);
    } catch {
      setQuoteError("Couldn't save. Please try again.");
    } finally {
      setSavingQuote(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteBook(book.id);
      onBookDeleted(); // parent closes this view and refreshes the grid
    } catch {
      setDeleteError("Couldn't delete. Please try again.");
      setDeleting(false);
    }
  }

  // Close on Escape, and lock body scroll for as long as this panel (i.e.
  // the modal) is mounted.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // While the export modal is open it owns Escape — closing only that
      // layer — so this one stays put.
      if (exporting) return;
      if (event.key !== "Escape") return;
      // An open editor or a pending delete confirmation owns Escape first —
      // it backs out that step rather than closing the whole modal.
      if (editingQuote) {
        setEditingQuote(false);
        return;
      }
      if (confirmingDelete) {
        setConfirmingDelete(false);
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, exporting, editingQuote, confirmingDelete]);

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Skeleton + real content, coordinated: the real content below is
          always mounted (so the 3D scene actually loads and can call
          onReady), just invisible and non-interactive until sceneReady —
          never a partial state of text without the model or vice versa.
          The skeleton sits on top via absolute inset-0, sized to match
          since the (invisible but present) real content drives this
          wrapper's actual box size. */}
      {!sceneReady && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <BookDetailSkeleton />
        </div>
      )}

      <div
        style={{
          opacity: sceneReady ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: sceneReady ? "auto" : "none",
        }}
        className="flex w-full flex-1 flex-col gap-4 sm:flex-row sm:gap-10"
      >
        {/* The live 3D book, staged on a soft warm glow — an exhibit under a
            spotlight, not a flat cutout. */}
        <div className="flex flex-col items-center shrink-0">
          <span className="mb-2 font-sans text-[0.65rem] uppercase tracking-[0.2em] text-accent sm:mb-3">
            {ordinal(book.bookNumber)} book {isOwner ? "you've read" : "read"}
          </span>

          <div className="relative aspect-[2/3] w-[clamp(11rem,24vh,13rem)] sm:w-72">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[-20%] rounded-full opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse 55% 60% at 50% 45%, rgba(201,151,58,0.18) 0%, rgba(201,151,58,0) 70%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[15%] bottom-[6%] h-6 rounded-full opacity-80 blur-md"
              style={{ background: "rgba(201,151,58,0.35)" }}
            />
            <BookScene book={book} onReady={() => setSceneReady(true)} />
          </div>
        </div>

        {/* Metadata, editorial style. Title/author/date are top-anchored and
            Share is the last flex item, so both sit at a fixed height no
            matter what the quote does. The flex-1 middle slot between them
            absorbs all the leftover space and centers the quote inside it
            (vertically + horizontally), so quote length never moves the
            date above it or the Share button below it — Share naturally
            lands level with the delete button, since both sit at the
            bottom of a column stretched to the image's full height. */}
        <div className="flex flex-1 flex-col">
          {/* Mobile font sizes clamp against viewport height (same approach
              as the 3D book's width) so short screens shrink the type
              proportionally instead of overflowing the panel; sm: restores
              the fixed desktop scale. */}
          <h2 className="font-serif text-[clamp(1.25rem,3.4vh,1.5rem)] leading-tight text-foreground sm:text-3xl">
            {book.title}
          </h2>
          <p className="mt-1 font-sans text-[clamp(0.8rem,2vh,0.875rem)] text-muted sm:mt-2 sm:text-base">{book.author}</p>

          <p className="mt-4 font-sans text-[0.65rem] uppercase tracking-[0.2em] text-muted sm:mt-7">
            {formatReadingRange(book.dateStarted, book.dateFinished)}
          </p>

          <div className="my-4 flex flex-1 flex-col items-center justify-center sm:my-8">
            {editingQuote && isOwner ? (
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center justify-end">
                  <span className="font-sans text-[0.6rem] tracking-[0.1em] text-muted">
                    {draft.length}/{MAX_QUOTE_LENGTH}
                  </span>
                </div>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={6}
                  maxLength={MAX_QUOTE_LENGTH}
                  autoFocus
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-serif text-[clamp(1rem,2.5vh,1.125rem)] italic leading-relaxed text-foreground/90 outline-none transition-colors focus:border-accent/60 sm:text-lg"
                />

                {quoteError && (
                  <p className="font-sans text-sm text-red-400/80">{quoteError}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuote(false)}
                    className="inline-flex rounded-full px-4 py-1.5 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuote}
                    disabled={savingQuote}
                    className="inline-flex rounded-full border border-accent/50 px-4 py-1.5 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
                  >
                    {savingQuote ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center">
                <blockquote className="text-center font-serif text-[clamp(0.875rem,2.3vh,1.125rem)] italic leading-normal text-foreground/90 sm:text-xl sm:leading-loose">
                  &ldquo;{book.quote}&rdquo;
                </blockquote>
                {/* Sits in flow right below the quote (so it tracks the quote's
                    height), but slides horizontally onto the same right-4 icon
                    rail as the close and delete buttons: the negative margin
                    cancels the difference between the panel padding (p-6 →
                    24px, sm:p-12 → 48px) and the rail's 16px inset. Same
                    h-9 w-9 hit area as those buttons, so equal right edges
                    mean the icon centers line up exactly. */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={startEditingQuote}
                    aria-label="Edit quote"
                    title="Edit quote"
                    className="-mr-2 mt-1 flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent sm:-mr-8 sm:mt-3"
                  >
                    <PencilIcon />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Opens the export preview/share modal, stacked on top of this one.
              The one solid-gold element in the modal — this is the pride-to-
              share moment, so it's the loudest thing on screen. The flex-1
              slot above absorbs all leftover height, so this always lands
              at the bottom of the column without needing its own margin.
              Owner-only: sharing a book to a story is an action taken on
              your own library, not something a visitor does on someone
              else's. */}
          {isOwner && (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex self-center rounded-full bg-accent px-5 py-2 font-sans text-[0.65rem] uppercase tracking-[0.2em] text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]"
            >
              Share
            </button>
          )}
        </div>

        {/* Delete affordance — bottom-right corner, on the same right-4 rail
            as the close button (and the edit-quote pencil above). This div's
            positioning context is BookDetailPanel's own root, which sits
            inside the panel's p-6/sm:p-12 padding — so a plain bottom-4/
            right-4 would land 8px/32px further in than the close button's
            (which is positioned directly against the panel). The negative
            offset cancels that out, the same compensation the pencil button
            uses via a negative margin. Confirm step opens as a small popover
            anchored to the same corner since the action is destructive and
            can't be undone. */}
        {isOwner && (
          <div className="absolute -bottom-2 -right-2 sm:-bottom-8 sm:-right-8">
            {confirmingDelete ? (
              <div className="w-60 rounded-xl border border-white/10 bg-[#161616] p-4 shadow-xl shadow-black/60">
                <p className="font-sans text-xs leading-relaxed text-muted">
                  Remove <span className="text-foreground">{book.title}</span>{" "}
                  from your library? This can&rsquo;t be undone.
                </p>
                {deleteError && (
                  <p className="mt-2 font-sans text-xs text-red-400/80">{deleteError}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex rounded-full border border-red-400/40 px-4 py-1.5 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-red-300/90 outline-none transition-colors hover:bg-red-400/90 hover:text-background focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-red-300/90"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="inline-flex rounded-full px-4 py-1.5 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label="Remove from library"
                title="Remove from library"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-white/5 hover:text-red-300/90 focus-visible:ring-2 focus-visible:ring-accent"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Thin-stroke line icons, sized to match the small icon-only trigger
    buttons. Hand-rolled rather than pulling in an icon library for two
    glyphs — see CLAUDE.md on flagging new dependencies. */
function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 3.5 16.5 6.5 6.5 16.5 3 17l0.5-3.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h12" />
      <path d="M8 6V4.5h4V6" />
      <path d="M5.5 6 6 16.5h8L14.5 6" />
      <path d="M8.5 9v4.5" />
      <path d="M11.5 9v4.5" />
    </svg>
  );
}
