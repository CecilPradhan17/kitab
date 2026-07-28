"use client";

import { useEffect, useRef, type RefObject } from "react";

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  /** Whether the trap is currently active. */
  active: boolean;
  /** Focus the first tabbable element when the trap activates. Default
      true; set false when the caller manages its own initial focus (e.g.
      AddBookModal autofocusing its search input). */
  initialFocus?: boolean;
}

/** Hand-rolled in place of focus-trap-react after three rounds of
    Safari-specific breakage chasing that library's internal state (a
    child-placed guard threw off its own boundary detection; a
    sibling-placed guard fought its separate "focus escaped, pull it back
    in" recovery net; registering the guard as its own container via
    containerElements still didn't hold up in Safari and the remaining
    library internals were opaque enough to not be worth a fourth blind
    attempt). This owns every line of the actual trapping logic, so there's
    no black-box interaction left to debug - only the real remaining
    problem, the Safari edge case FocusGuard.tsx exists to patch.

    Deliberately minimal: just Tab-cycling, initial focus, and returning
    focus to the trigger element on deactivate. Escape-to-close is NOT
    handled here - every caller already has its own Escape listener.

    Drives EVERY Tab press itself, not just the two boundary ones, AND
    forces an explicit tabIndex onto every button/link it finds - both
    exist because of the same underlying Safari behavior, confirmed via
    focus-trap's own README and issue #783 (github.com/focus-trap/focus-trap):
    "By default, Safari does not tab through all elements on a page... you
    and your users [must] enable... Full Keyboard Access." Concretely,
    without that OS preference (which most users have off), Safari treats
    plain <button>/<a> elements as outside its keyboard-focusable set
    entirely - not just skipped by native Tab, but seemingly not reliably
    focusable via a script-driven .focus() call either, which is what made
    the intercept-every-press approach alone still get stuck on plain
    buttons. An explicit tabIndex is the documented fix used across the
    ecosystem for this (e.g. mayank.co/blog/safari-focus): it moves the
    element into the set Safari treats as keyboard-focusable regardless of
    that preference. Applied here at the trap level (rather than by hand on
    every button in every modal) so it's automatic for any current or
    future trapped content, and reapplied on every getTabbable() call so it
    still catches buttons that appear later (e.g. AddBookModal's phase
    switches).

    Stacking (e.g. ExportModal opened on top of BookDetailModal, both
    active at once) is handled via a module-level stack: only the
    most-recently-activated trap acts on Tab, so a lower trap doesn't
    fight the one on top of it - without this, the lower trap would see
    focus inside the *other* modal's panel, not recognize it as one of
    its own tabbable nodes, and wrongly yank focus back into itself. */
const activeTraps: symbol[] = [];

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { active, initialFocus = true }: UseFocusTrapOptions
) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const idRef = useRef<symbol>(undefined);
  if (idRef.current === undefined) idRef.current = Symbol("focus-trap");

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const id = idRef.current!;
    activeTraps.push(id);
    triggerRef.current = document.activeElement as HTMLElement | null;

    function getTabbable(): HTMLElement[] {
      const elements = Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute("data-focus-guard"));

      for (const element of elements) {
        if (
          (element.tagName === "BUTTON" || element.tagName === "A") &&
          !element.hasAttribute("tabindex")
        ) {
          element.tabIndex = 0;
        }
      }

      return elements;
    }

    if (initialFocus) {
      getTabbable()[0]?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      // Not the topmost trap (something's stacked on top) - stay dormant.
      if (activeTraps[activeTraps.length - 1] !== id) return;

      const tabbable = getTabbable();
      if (tabbable.length === 0) return;

      const current = document.activeElement;
      const currentIndex = current ? tabbable.indexOf(current as HTMLElement) : -1;

      event.preventDefault();

      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? tabbable.length - 1
          : currentIndex - 1
        : currentIndex === -1 || currentIndex === tabbable.length - 1
          ? 0
          : currentIndex + 1;

      tabbable[nextIndex].focus();
    }

    // Capture phase so this reliably sees Tab before anything else does -
    // matches how focus-trap-react's own listener was registered.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      activeTraps.splice(activeTraps.indexOf(id), 1);
      triggerRef.current?.focus();
    };
  }, [active, initialFocus, containerRef]);
}
