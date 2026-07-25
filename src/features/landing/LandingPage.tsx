import Link from "next/link";
import RotatingWord from "./RotatingWord";
import WordLookup from "./WordLookup";
import ScrollHero from "./ScrollHero";
import GoldLampGlow from "./GoldLampGlow";

// The marketing landing page shown to logged-out visitors at "/". Purely
// presentational — the auth check and the redirect for logged-in users both
// live in app/page.tsx, not here.
//
// ScrollHero is the full-bleed scroll-driven section below the headline +
// WordLookup card: phone/e-reader/headline stagger in around a book that's
// always present (no fade), so by the time the stagger finishes all four
// are in view together, then a blackout leads into the organized Kitab
// branding beat. A live 3D book render remains a planned future addition
// on top of this (see CLAUDE.md on visual quality being the project's main
// unproven risk).
export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center px-6 pt-[6vh] text-center">
      <div className="absolute right-5 top-5 z-10 flex items-center gap-4 sm:right-8 sm:top-8">
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

      {/* Gives GoldLampGlow room above the heading to render its bar/cone/
          dust in full (it's built for a spacious parent, not a tight wrap
          around just the text) — the heading sits at the bottom of this
          zone, lit from above. */}
      <div className="relative flex min-h-[46vh] w-full max-w-2xl flex-col items-center justify-end">
        <GoldLampGlow />

        <h1 className="relative z-10 font-serif text-4xl leading-tight text-foreground sm:text-6xl">
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
      </div>

      <WordLookup />

      <ScrollHero />
    </main>
  );
}
