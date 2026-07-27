"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import FocusTrap from "focus-trap-react";
import FocusGuard from "@/features/a11y/FocusGuard";
import {
  clearStoredToken,
  clearStoredUser,
  getStoredUser,
} from "@/lib/auth";

// App-wide left-hand navigation: a fixed hamburger button that opens a
// slide-in drawer. Mounted once in the root layout, which survives
// client-side navigation — so login state is re-checked on every route
// change (login and logout both navigate) rather than only on mount.
export default function SideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  // localStorage is read in an effect (not render) so the server-rendered
  // markup — which can't know about the user — matches the first client paint.
  useEffect(() => {
    setLoggedIn(getStoredUser() !== null);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // The drawer's only item is "Log out", so there's nothing to show a
  // logged-out visitor (login page, shared profile links).
  if (!loggedIn) return null;

  function handleLogout() {
    // Auth is a stateless JWT in localStorage, so logout is purely
    // client-side: drop the token and cached user, then leave. There is no
    // server-side session to destroy.
    clearStoredToken();
    clearStoredUser();
    setOpen(false);
    setLoggedIn(false);
    router.replace("/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="side-nav"
        className="absolute left-5 top-5 z-40 flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden className="h-px w-4 bg-current" />
        <span aria-hidden className="h-px w-4 bg-current" />
        <span aria-hidden className="h-px w-4 bg-current" />
      </button>

      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Unlike the modals, this drawer stays mounted (open/closed toggles
          translate-x + inert) rather than unmounting, so the trap needs an
          explicit active prop instead of relying on mount/unmount.
          escapeDeactivates: false - Escape is already handled above. */}
      {/* Guards only render while open (unlike the modals' guards, which can
          rely on their whole modal being unmounted when closed) - otherwise
          they'd sit outside nav's inert scoping and stay tabbable even with
          the drawer closed. */}
      {open && <FocusGuard position="first" />}
      <FocusTrap active={open} focusTrapOptions={{ escapeDeactivates: false }}>
      <nav
        id="side-nav"
        aria-label="Main menu"
        inert={!open}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0f0f0f] p-6 shadow-2xl shadow-black/80 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden className="text-xl leading-none">
            &times;
          </span>
        </button>

        <p className="font-sans text-[0.65rem] uppercase tracking-[0.3em] text-accent">
          Kitab
        </p>

        <div className="my-6 h-px bg-white/10" />

        <button
          type="button"
          onClick={handleLogout}
          className="py-2 text-left font-sans text-xs uppercase tracking-[0.2em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
        >
          Log out
        </button>
      </nav>
      </FocusTrap>
      {open && <FocusGuard position="last" />}
    </>
  );
}
