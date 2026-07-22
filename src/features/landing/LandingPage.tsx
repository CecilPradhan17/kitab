import Link from "next/link";
import RotatingWord from "./RotatingWord";

// The marketing landing page shown to logged-out visitors at "/". Purely
// presentational — the auth check and the redirect for logged-in users both
// live in app/page.tsx, not here.
//
// Basics only for now: wordmark, headline, one-line pitch, sign-up/sign-in
// CTAs. A live 3D book render is the planned hero centerpiece (see CLAUDE.md
// on visual quality being the project's main unproven risk) but is
// deliberately left for a later pass rather than bolted on here.
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-logo text-sm uppercase tracking-[0.4em] text-accent">
        Kitab
      </p>

      <h1 className="mt-6 max-w-2xl font-serif text-4xl leading-tight text-foreground sm:text-6xl">
        Your digital{" "}
        <RotatingWord
          words={[
            { text: "Kitab", className: "font-logo uppercase tracking-wide text-accent" },
            { text: "Book", className: "text-foreground" },
          ]}
        />{" "}
        collection.
      </h1>

      <p className="mt-6 max-w-md font-sans text-sm text-muted sm:text-base">
        Track every book you finish, reveal it as a 3D object on your shelf,
        and share the story when you turn the last page.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/register"
          className="w-full rounded bg-accent px-8 py-3.5 text-center font-sans text-xs font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-accent/90 sm:w-auto"
        >
          Create your library
        </Link>
        <Link
          href="/login"
          className="font-sans text-sm text-muted transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
