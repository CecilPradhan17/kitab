"use client";

import { useLayoutEffect, useRef, useState, type DependencyList } from "react";

/** Collects refs for the two FocusGuard sentinels plus the trapped panel
    itself, and registers all three as focus-trap's containerElements once
    mounted (default `deps: []` - re-collect any time the guards themselves
    remount, e.g. SideNav's drawer passes `[open]` since its guards mount
    and unmount with the drawer instead of the whole component).

    Necessary because the simpler-looking options both broke something:
    - Guards as children INSIDE the trapped container: focus-trap scans the
      whole container for tabbable nodes to work out where "first"/"last"
      are for its own keydown-based wrapping, so a guard living inside
      became part of that computation and threw off which real element it
      considered last, making the actual last control unreachable.
    - Guards as plain siblings OUTSIDE any registered container: focus-trap
      has a separate "focus escaped, pull it back in" safety net (a
      document-level focusin listener) that doesn't know a guard receiving
      focus is intentional, so it fights the guard's own redirect - looked
      like Tab had stopped working at all.

    Registering each guard as its own container sidesteps both: focus-trap
    only scans a container's DESCENDANTS for tabbable nodes (via the
    `tabbable` package's default `includeContainer: false`), never the
    container element itself, so an empty guard contributes zero tabbable
    nodes to the sequence - but Node.contains() (what focus-trap uses to
    check whether a focus target is "contained") is inclusive of the node
    itself, so the guard still counts as contained and the escape-recovery
    net leaves it alone. */
export function useGuardedTabTrap<T extends HTMLElement = HTMLDivElement>(
  deps: DependencyList = []
) {
  const firstGuardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<T>(null);
  const lastGuardRef = useRef<HTMLDivElement>(null);
  const [containerElements, setContainerElements] = useState<HTMLElement[] | undefined>(
    undefined
  );

  // Layout effect (not a regular effect) so the containers are registered
  // before the browser paints/the user can interact - regular useEffect
  // runs after paint, leaving a brief window where a fast Tab press could
  // still hit the escape-recovery race this hook exists to avoid.
  useLayoutEffect(() => {
    if (firstGuardRef.current && panelRef.current && lastGuardRef.current) {
      setContainerElements([firstGuardRef.current, panelRef.current, lastGuardRef.current]);
    } else {
      setContainerElements(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { firstGuardRef, panelRef, lastGuardRef, containerElements };
}
