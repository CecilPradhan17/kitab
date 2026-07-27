"use client";

import type { Ref } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusGuardProps {
  /** Which end of the trapped container this guard sits at. "first" (placed
      immediately before the trapped element) sends focus to its last real
      focusable descendant on Shift+Tab wrapping backward past it; "last"
      (placed immediately after) sends it to the first real focusable
      descendant on Tab wrapping forward past it. */
  position: "first" | "last";
  /** Collected by useGuardedTabTrap and registered with focus-trap as one of
      its containerElements - see that hook's doc comment for why a guard
      needs to be its own container rather than a plain sibling. */
  ref?: Ref<HTMLDivElement>;
}

/** focus-trap-react correctly traps Tab in Chrome/Firefox by intercepting
    the keydown event and manually redirecting focus. Safari doesn't
    reliably let that interception win against its own native "leave the
    page for browser chrome" step, so a modal can tab out to the address
    bar instead of wrapping back in - found live, in Safari, by tabbing
    through AddBookModal (Chrome/Firefox were unaffected, confirming it's
    this Safari-specific gap rather than a broken trap).

    A focus guard sidesteps the race entirely instead of trying to win it:
    it's a real, normal tabbable DOM node, so Safari's native "what's the
    next focusable thing" resolution finds it and stays on the page rather
    than reaching for chrome. Its focus handler (not a keydown handler)
    then redirects into the trap - a `focus` event isn't racing a native
    default action the way `keydown` is, so it fires reliably everywhere.

    Must be used together with useGuardedTabTrap, which registers this
    guard as its own container with focus-trap (see that hook's comment for
    why - a plain sibling isn't enough on its own). Placed as a sibling
    immediately before/after the focus-trapped element in the DOM either
    way, which is what the next/previousElementSibling lookup below relies
    on to find the real content to redirect into. */
export default function FocusGuard({ position, ref }: FocusGuardProps) {
  function handleFocus(event: React.FocusEvent<HTMLDivElement>) {
    const container =
      position === "first"
        ? event.currentTarget.nextElementSibling
        : event.currentTarget.previousElementSibling;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const target = position === "first" ? focusable[focusable.length - 1] : focusable[0];
    target?.focus();
  }

  return (
    <div
      ref={ref}
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
