"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { Book } from "@/features/library/mockBooks";
import type { Profile } from "@/features/profile/types";
import { renderBookToDataURL } from "./renderBook";
import StoryExportCard, { CARD_WIDTH, CARD_HEIGHT } from "./StoryExportCard";
import StoryExportCardSkeleton from "./StoryExportCardSkeleton";

// The on-screen preview's max width, in CSS px. The actual scale is measured
// at runtime from the preview box's real rendered width (see the
// ResizeObserver below), which shrinks on narrow viewports via w-full — so
// the card always fits the modal instead of overflowing on small screens.
// The captured PNG is untouched either way: capturePng() always renders the
// hidden, full-size node at exactly CARD_WIDTH×CARD_HEIGHT (1080×1920,
// Instagram Story format), independent of this preview scale.
const PREVIEW_MAX_WIDTH = 352;

interface ExportCardPanelProps {
  /** Always defined — ExportModal only ever mounts this (keyed on book.id)
      once a book is actually being exported. Keying on book.id is what
      resets heroSrc/renderError/busy/copied/previewScale on every export,
      instead of a useEffect manually resetting them (which
      react-hooks/set-state-in-effect flagged here the same way it did on
      BookDetailModal's analogous per-book state — see BookDetailPanel's
      doc comment for the fuller explanation of this pattern). */
  book: Book;
  profile: Profile;
}

/** The export preview + share modal's actual content: the offscreen 3D hero
    render, the scaled preview (skeleton until it's ready), and the
    Copy/Download actions. Split out from ExportModal so it can be keyed on
    book.id there. */
export default function ExportCardPanel({ book, profile }: ExportCardPanelProps) {
  // The 3D hero PNG, produced once per mount. null while it's still rendering.
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
  // first layout, viewport resize, or orientation change. Plain empty deps
  // are correct here (unlike when this lived directly in ExportModal): this
  // component only ever mounts once book is truthy, so the ref is already
  // attached by the time this runs — no "book still null on first mount"
  // race to guard against.
  useLayoutEffect(() => {
    const node = previewBoxRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setPreviewScale(width / CARD_WIDTH);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Kick off the offscreen 3D hero render on mount. No reset needed first —
  // a fresh key already means heroSrc/renderError/copied start at their
  // initial values — just the async kickoff and its .then/.catch callbacks
  // (which react-hooks/set-state-in-effect doesn't flag: those genuinely are
  // "calling setState in a callback when external state changes", the
  // exception the rule's own docs carve out).
  useEffect(() => {
    let cancelled = false;

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

  /** Render the full-size card node to a 1080×1920 PNG data URL. Awaiting
      document.fonts.ready is critical: html-to-image will silently fall back to
      system fonts if Playfair/Inter aren't loaded at capture time (CLAUDE.md). */
  async function capturePng(): Promise<string> {
    await document.fonts.ready;
    const node = captureRef.current;
    if (!node) throw new Error("Export card not mounted");

    // html-to-image does not wait for data-URL <img> elements while cloning
    // the node (it assumes they are already ready). The 3D book hero is a
    // large data URL, though, and can still be decoding when someone taps an
    // action. In that case the surrounding card is captured correctly but
    // the browser paints an empty hero area. Wait for every image in the
    // actual capture tree before handing it to html-to-image; this also covers
    // the optional profile avatar.
    await Promise.all(
      Array.from(node.querySelectorAll("img"), async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve, reject) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener(
              "error",
              () => reject(new Error("An image in the share card failed to load")),
              { once: true },
            );
          });
        }

        if (image.decode) await image.decode();
        if (!image.naturalWidth) {
          throw new Error("An image in the share card could not be decoded");
        }
      }),
    );

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
      link.download = `kitab-${book.title.toLowerCase().replace(/\s+/g, "-")}.png`;
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
    <>
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
          <StoryExportCardSkeleton />
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

      {/* Hidden full-size capture source. Positioned off-screen (not display:none
          / visibility:hidden, which html-to-image captures as blank) so it
          renders at true 1080×1920 for a 1:1 capture. position:fixed is
          viewport-relative regardless of DOM nesting depth (unless an
          ancestor creates a new containing block via transform/filter/etc,
          which none here do), so nesting this one level deeper than before
          doesn't change its behavior. */}
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
    </>
  );
}
