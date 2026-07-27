"use client";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusGuardProps {
  /** Which end of the trapped container this guard sits at. Determines which
      direction it redirects focus: "first" (placed before the real content)
      sends focus to the last real element on Shift+Tab wrapping backward
      past it; "last" (placed after) sends it to the first real element on
      Tab wrapping forward past it. */
  position: "first" | "last";
}

/** focus-trap-react correctly traps Tab in Chrome/Firefox by intercepting
    the keydown event and manually redirecting focus. Safari doesn't
    reliably let that interception win against its own native "leave the
    page for browser chrome" step, so a modal can tab out to the address
    bar instead of wrapping back in - found live, in Safari, by tabbing
    through AddBookModal (Chrome/Firefox were unaffected, confirming it's
    this Safari-specific gap rather than a broken trap).

    A focus guard sidesteps the race entirely instead of trying to win it:
    it's a real, normal tabbable DOM node placed at each end of the trapped
    container, so Safari's native "what's the next focusable thing"
    resolution finds it and stays on the page rather than reaching for
    chrome. Its focus handler (not a keydown handler) then redirects into
    the trap - a `focus` event isn't racing a native default action the way
    `keydown` is, so it fires reliably in every browser.

    Place one with position="first" as the very first child inside a
    focus-trapped container, and one with position="last" as the very last. */
export default function FocusGuard({ position }: FocusGuardProps) {
  function handleFocus(event: React.FocusEvent<HTMLDivElement>) {
    const container = event.currentTarget.parentElement;
    if (!container) return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((element) => !element.hasAttribute("data-focus-guard"));

    const target = position === "first" ? focusable[focusable.length - 1] : focusable[0];
    target?.focus();
  }

  return (
    <div
      data-focus-guard
      tabIndex={0}
      onFocus={handleFocus}
      style={{
        position: "fixed",
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
