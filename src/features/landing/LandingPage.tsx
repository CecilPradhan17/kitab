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
    <main className="relative flex min-h-screen flex-col items-center px-6 pt-[2vh] text-center">
      <div className="absolute right-5 top-5 z-10 flex items-center gap-4 sm:right-8 sm:top-8">
        <Link
          href="/register"
          className="rounded border border-foreground/25 px-5 py-2 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-foreground/50"
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

      {/* GoldLampGlow's cone/dust reach ~750-800px of natural falloff below
          the bar before its own gradient/opacity hits zero (independent of
          viewport height, since the SVG's dimensions are fixed px, not
          scaled to the container) - this zone's min-height only needs to
          clear that point so overflow-hidden never clips the light before it
          finishes fading on its own. WordLookup now lives inside this same
          zone (not after it) so it sits under the still-fading tail of the
          light instead of past it in plain black. */}
      <div className="relative flex min-h-[860px] w-full max-w-2xl flex-col items-center">
        <GoldLampGlow />

        <h1 className="relative z-10 mt-36 font-serif text-4xl leading-tight text-foreground sm:mt-44 sm:text-6xl">
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

        <Link
          href="/register"
          className="relative z-10 mt-12 rounded-full bg-accent px-8 py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-accent/90"
        >
          Create your library
        </Link>

        {/* Back in normal flow directly after the button (not absolutely
            bottom-anchored to the whole 860px section, which put too much
            air between them) - a small mt gives "slightly below the
            button" for free, without guessing a pixel offset that has to
            track the button's own position. Centered under the button at
            every breakpoint via the parent's default `items-center`. */}
        <div className="relative z-10 mt-4">
          <WordLookup />
        </div>
      </div>

      <ScrollHero />

      {/* Closing CTA after the scroll sequence ends - visitors who scrolled
          all the way through the three stages shouldn't have to scroll back
          up to the hero button to sign up. Two side-by-side paths (sign up /
          browse an example library) rather than one, split by "or" - stacks
          vertically on mobile where there's no room for two columns. */}
      <section className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-12 px-6 py-16 sm:flex-row sm:gap-16">
        <div className="flex flex-col items-center gap-5">
          <h3 className="font-sans text-2xl font-bold text-foreground sm:text-3xl">
            Start your digital library today
          </h3>
          <CtaArrow />
          <Link
            href="/register"
            className="rounded-full bg-accent px-8 py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-accent/90"
          >
            Create your library
          </Link>
        </div>

        <p className="font-serif text-xl italic text-muted">or</p>

        <div className="flex flex-col items-center gap-5">
          <h3 className="font-sans text-2xl font-bold text-foreground sm:text-3xl">
            Check out my library for example :)
          </h3>
          <CtaArrow />
          <Link
            href="/cecil_pradhan"
            className="rounded-full border border-foreground/25 px-8 py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-foreground/50"
          >
            View my library
          </Link>
        </div>
      </section>

      {/* Closing logo beat - same KITAB wordmark treatment used on the
          library page header ([username]/page.tsx: font-logo,
          tracking-[0.5em], paddingLeft offsetting the trailing letter-
          spacing), just sized up to hero scale here since it's the page's
          final, standalone statement rather than a small section label.
          Gold (text-accent) here instead of that page's white, matching the
          "Kitab" in the hero h1 above instead. */}
      <div className="flex flex-col items-center gap-6 pb-24 pt-4">
        <p
          className="font-logo text-5xl tracking-[0.5em] text-accent sm:text-7xl"
          style={{ paddingLeft: "0.5em" }}
        >
          KITAB
        </p>
        <p className="font-serif text-lg italic text-muted">
          — Created by a reader who needed a way to track his books. 
        </p>
      </div>
    </main>
  );
}

// Same down-pointing arrow used on the Share phone's reveal prompt
// (HeroStages.tsx) - reused here to point from each heading down to its
// button below.
function CtaArrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <path d="M12 4v14M6 13l6 6 6-6" />
    </svg>
  );
}
