"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { Book } from "@/features/library/mockBooks";
import type { Profile } from "@/features/profile/types";
import { renderBookToDataURL } from "./renderBook";
import StoryExportCard, { CARD_WIDTH, CARD_HEIGHT } from "./StoryExportCard";

// The on-screen preview's max width, in CSS px (roughly what the old fixed
// 0.33 scale produced). The actual scale is measured at runtime from the
// preview box's real rendered width, which shrinks on narrow viewports via
// w-full — so the card always fits the modal instead of overflowing on
// small screens. The captured PNG is untouched either way: capturePng()
// always renders the hidden, full-size node at exactly CARD_WIDTH×CARD_HEIGHT
// (1080×1920, Instagram Story format), independent of this preview scale.
const PREVIEW_MAX_WIDTH = 352;

interface ExportModalProps {
  /** The book to export, or null when closed — same single-source-of-truth
      pattern as BookDetailModal (no separate "open" boolean). */
  book: Book | null;
  /** The library's owner — passed straight through to StoryExportCard for
      the quote-attribution avatar/name (both the visible preview and the
      hidden full-size capture node need it, so the downloaded PNG matches
      what's shown). */
  profile: Profile;
  onClose: () => void;
}

/** The export preview + share modal. On open it kicks off the offscreen 3D
    render, shows the resulting StoryExportCard, and lets the user copy or
    download it as a 1080×1920 PNG. Read-only here — the quote shown is whatever
    the book already has (quote editing will live in the detail modal later). */
export default function ExportModal({ book, profile, onClose }: ExportModalProps) {
  // The 3D hero PNG, produced once per open. null while it's still rendering.
  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  // Transient action state for the buttons.
  const [busy, setBusy] = useState<"copy" | "download" | null>(null);
  const [copied, setCopied] = useState(false);

  // The hidden, full-size card node that html-to-image captures from. Kept
  // separate from the visible (scaled) preview so capture never has to undo a
  // CSS transform.
  const captureRef = useRef<HTMLDivElement>(null);

  // The visible preview box (sized via CSS, not JS) and the scale factor
  // measured from its actual rendered width, so the 1080-wide card always
  // fits it exactly.
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(PREVIEW_MAX_WIDTH / CARD_WIDTH);

  // Recompute the scale whenever the preview box's rendered width changes —
  // first layout, viewport resize, or orientation change — instead of a
  // fixed constant, so the 9:16 card fits the modal on any screen size
  // rather than overflowing it on narrow ones. Keyed on `book`: this
  // component stays mounted permanently (the parent just swaps `book`
  // between null and a value), so the box's ref is still null on the very
  // first mount — an empty dependency array would attach the observer to
  // nothing and never retry once the ref actually exists.
  useLayoutEffect(() => {
    const node = previewBoxRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setPreviewScale(width / CARD_WIDTH);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [book]);

  // Render the 3D hero whenever a book opens. Reset all state first so a
  // re-open (or switching books) never shows the previous book's render.
  useEffect(() => {
    if (!book) return;
    let cancelled = false;

    setHeroSrc(null);
    setRenderError(null);
    setCopied(false);

    renderBookToDataURL(book)
      .then((url) => {
        if (!cancelled) setHeroSrc(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setRenderError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [book]);

  // Escape closes the export modal. The detail modal underneath suppresses its
  // own Escape handler while this is open, so one press closes one layer.
  useEffect(() => {
    if (!book) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [book, onClose]);

  if (!book) return null;

  /** Render the full-size card node to a 1080×1920 PNG data URL. Awaiting
      document.fonts.ready is critical: html-to-image will silently fall back to
      system fonts if Playfair/Inter aren't loaded at capture time (CLAUDE.md). */
  async function capturePng(): Promise<string> {
    await document.fonts.ready;
    const node = captureRef.current;
    if (!node) throw new Error("Export card not mounted");
    // pixelRatio 1 so the output is exactly CARD_WIDTH×CARD_HEIGHT (the hero is
    // already rendered at high res, so it stays crisp).
    return toPng(node, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      pixelRatio: 1,
      cacheBust: true,
    });
  }

  async function handleDownload() {
    setBusy("download");
    try {
      const dataUrl = await capturePng();
      const link = document.createElement("a");
      link.download = `kitab-${book!.title.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    setBusy("copy");
    try {
      // Safari invalidates the user-gesture as soon as you `await` before
      // calling clipboard.write, so we can't capture-then-write. Instead pass a
      // Promise<Blob> as the ClipboardItem value and call write synchronously,
      // within the click's gesture — Safari resolves the promise itself, and
      // Chrome supports the same pattern.
      const pngBlob = (async () => {
        const dataUrl = await capturePng();
        return (await fetch(dataUrl)).blob();
      })();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Clipboard image write isn't supported in every browser; surface it
      // rather than failing silently.
      setRenderError(
        err instanceof Error
          ? `Couldn't copy image: ${err.message}`
          : String(err),
      );
    } finally {
      setBusy(null);
    }
  }

  // TODO(share): "Share to Instagram" goes here — likely the Web Share API
  // (navigator.share with the PNG as a File) on supported mobile browsers.
  // Intentionally not implemented yet (CLAUDE.md).

  const isRendering = !heroSrc && !renderError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Export ${book.title}`}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 shadow-2xl shadow-black/80"
      >
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

        <h2 className="font-sans text-[0.7rem] uppercase tracking-[0.25em] text-accent">
          Share to story
        </h2>

        {/* Preview area. w-full (capped by max-w) lets the box itself shrink
            to fit the modal on narrow screens; aspect-[9/16] keeps it at the
            card's true Instagram Story ratio at any width. The ResizeObserver
            above measures this box's real rendered width every time it
            changes, so previewScale always matches exactly. The card is
            scaled from its top-left corner: a CSS transform doesn't shrink
            the element's 1080×1920 layout box, so it must NOT be flex-centered
            here (that would center the full-size box and clip it away) —
            it's pinned to the corner and fills the sized container exactly. */}
        <div
          ref={previewBoxRef}
          className="relative w-full max-w-[352px] aspect-[9/16] overflow-hidden rounded-lg"
        >
          {renderError ? (
            <div className="flex h-full w-full items-center justify-center">
              <p className="px-4 text-center font-sans text-xs text-red-400">
                {renderError}
              </p>
            </div>
          ) : isRendering ? (
            <div className="flex h-full w-full items-center justify-center">
              <p className="animate-pulse font-sans text-[0.7rem] uppercase tracking-[0.25em] text-muted">
                Rendering…
              </p>
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
              <StoryExportCard book={book} profile={profile} heroSrc={heroSrc!} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex w-full items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isRendering || busy !== null || !!renderError}
            className="flex-1 rounded-full border border-accent/50 px-4 py-2.5 font-sans text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent"
          >
            {copied ? "Copied" : busy === "copy" ? "Copying…" : "Copy image"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isRendering || busy !== null || !!renderError}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 font-sans text-xs uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "download" ? "Saving…" : "Download PNG"}
          </button>
        </div>
      </div>

      {/* Hidden full-size capture source. Positioned off-screen (not display:none
          / visibility:hidden, which html-to-image captures as blank) so it
          renders at true 1080×1920 for a 1:1 capture. */}
      {heroSrc && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            left: -99999,
            pointerEvents: "none",
          }}
        >
          <div ref={captureRef}>
            <StoryExportCard book={book} profile={profile} heroSrc={heroSrc} />
          </div>
        </div>
      )}
    </div>
  );
}
