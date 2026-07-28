"use client";

import { FOCUSABLE_SELECTOR } from "./useFocusTrap";

interface FocusGuardProps {
  /** Which end of the trapped container this guard sits at. "first" (placed
      as the container's first child) sends focus to the last real
      focusable descendant on Shift+Tab wrapping backward past it; "last"
      (placed as the last child) sends it to the first real focusable
      descendant on Tab wrapping forward past it. */
  position: "first" | "last";
}

/** Patches a Safari-specific gap in useFocusTrap: calling
    event.preventDefault() on the boundary Tab keypress (see that hook)
    reliably stops the browser's default action in Chrome/Firefox, but
    Safari doesn't reliably let that win against its own native "leave the
    page for browser chrome" step - found live, in Safari, by tabbing
    through AddBookModal (Chrome/Firefox were unaffected, confirming it's
    this Safari-specific gap rather than a broken trap).

    A focus guard sidesteps the race entirely instead of trying to win it:
    it's a real, normal tabbable DOM node, so Safari's native "what's the
    next focusable thing" resolution finds it and stays on the page rather
    than reaching for chrome. Its focus handler (not a keydown handler)
    then redirects into the trap - a `focus` event isn't racing a native
    default action the way `keydown` is, so it fires reliably everywhere.

    Place as the first and last children inside the same container passed
    to useFocusTrap - that hook's own tabbable-node scan excludes
    data-focus-guard elements, so these are invisible to normal Tab
    cycling and only ever matter for Safari's native fallback. */
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
