import Link from "next/link";
import RotatingWord from "./RotatingWord";

// The marketing landing page shown to logged-out visitors at "/". Purely
// presentational — the auth check and the redirect for logged-in users both
// live in app/page.tsx, not here.
//
// Basics only for now: headline + sign-up/sign-in CTAs. A live 3D book
// render is the planned hero centerpiece (see CLAUDE.md on visual quality
// being the project's main unproven risk) but is deliberately left for a
// later pass rather than bolted on here.
export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center px-6 pt-[22vh] text-center">
      <div className="absolute right-5 top-5 flex items-center gap-4 sm:right-8 sm:top-8">
        <Link
          href="/register"
          className="font-sans text-sm text-muted transition-colors hover:text-foreground"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded bg-accent px-5 py-2 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-accent/90"
        >
          Login
        </Link>
      </div>

      <h1 className="max-w-2xl font-serif text-4xl leading-tight text-foreground sm:text-6xl">
        Your digital{" "}
        <RotatingWord
          words={[
            {
              text: "Kitab",
              // Cormorant Garamond's baseline sits higher within a shared
              // line-height than Playfair's (different ascent/descent
              // proportions), so it needs a manual nudge down to visually
              // land on the same baseline as the rest of the sentence.
              className:
                "relative top-[0.08em] font-logo uppercase tracking-wide text-accent",
            },
            { text: "Book", className: "text-foreground" },
          ]}
        />{" "}
        collection.
      </h1>
    </main>
  );
}
