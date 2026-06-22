# Project: Book Read Portfolio

## What this is

A web app for tracking books read, displayed as an aesthetically premium personal
library. Each book has a 3D interactive model (shown on click, not in the grid).
Users can share a public profile link of their library. Users can export a 3D,
Instagram-Story-style image of a book they just finished (inspired by Strava's
run-sharing feature), styled like a dark, cinematic, editorial book reveal.

## Goals (for Claude Code to keep in mind)

1. This is a portfolio/resume project — code quality and the ability for the
   developer to explain every decision in an interview matters as much as
   shipping speed.
2. The developer wants to learn while building, not just receive finished code.
3. Visual/UX quality is the primary unproven risk of this project. Functional
   correctness alone is not "done" — things must also look and feel premium.

## Current phase

**Frontend prototyping only. No backend yet.** Building standalone, presentational
components against mock data to validate the look and feel before any backend,
auth, or database work begins.

## Tech stack (decided, do not change without discussion)

- **Frontend:** Next.js (App Router), React, **TypeScript**, Tailwind CSS.
  Project uses a `src/` directory (`src/app/`, etc.). All component files use
  `.tsx` (or `.ts` for non-component logic/utilities), not `.js`/`.jsx`.
- **3D:** Three.js via React Three Fiber (`@react-three/fiber`) +
  `@react-three/drei` (helpers) + `@react-three/postprocessing` (bloom/glow effects)
- **Image export:** `html-to-image` (client-side only, no server rendering)
- **Backend (future, not yet built):** Express + Node + TypeScript + PostgreSQL
- **Hosting (future):** Railway or Render for the backend; Vercel for the
  Next.js frontend. AWS migration is a deliberate later milestone, not a V1 goal.
- **Package manager:** npm
- **Fonts:** Playfair Display (or DM Serif Display) for titles/serif moments,
  Inter for UI/labels (small-caps style, wide letter-spacing for metadata labels)
- **Color accent:** warm gold (~#C9973A) as the brand accent, dark/near-black
  backgrounds throughout

## Data approach for V1 (current phase)

- Use **mock data only** — no live API calls, no backend.
- `mockBooks.ts` lives in `src/features/library` and should contain 5-10 entries
  using **real cover image URLs** (sourced from Open Library by ISBN —
  `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg` — preferred over Google
  Books cover links, which require exact volume IDs and are easy to get wrong/
  broken; Open Library by ISBN is more reliable for this design phase), not
  placeholder gray boxes — this gives realistic image dimensions/quality to
  design against. Include at least 1-2 books with non-standard cover aspect
  ratios to stress-test layout, not just uniform hardcover dimensions.
- Mock data shape must match the eventual real data shape exactly, defined as
  a `Book` type/interface, e.g.:

```ts
type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  dateStarted: string;
  dateFinished: string;
  bookNumber: number;
  quote: string;
};
```

- Components must be **presentational only** — they take data via props and
  have zero knowledge of where the data came from. This ensures swapping mock
  data for a real fetch later requires no component rewrites.

## Architecture decisions (locked in, with reasoning)

- **Hybrid 2D/3D rendering:** The library grid uses flat 2D cover cards (image +
  CSS glow), NOT live 3D objects. Full 3D is only rendered on-demand when a user
  clicks into a single book. Reason: rendering many simultaneous 3D objects
  causes GPU/memory issues at scale (high draw calls, large texture memory).
  2D-grid-then-3D-detail avoids this entirely while still delivering the "wow"
  moment where it matters most.
- **Card glow effect:** Each book card has a single, uniform brand-gold
  underglow (the `--accent` token). We deliberately decided NOT to extract a
  per-cover color (e.g. via `fast-average-color`) — a consistent gold glow
  reinforces the brand and keeps the grid visually calm. Do not reintroduce
  dynamic color extraction.
- **3D book model:** One reusable mesh/geometry for all books ("cookie cutter"
  approach). Only the cover texture changes per book. Do not generate unique
  geometry per book.
- **Image sourcing (future, not yet built):** When backend work begins, cover
  images will be fetched from Google Books API once per unique ISBN, cached in
  our own storage, and never re-fetched from Google after that. Two stored
  variants per cover: a small display version for the grid, a larger version
  for the 3D texture. This is a future-phase decision, documented here so it
  isn't relitigated later — not something to implement during the current
  frontend-only phase.

## Folder structure

**Feature-based, not type-based.** Group files by what feature/domain they
belong to, not by file type. Reason: this project has a small number of clear
features (library, book detail, story export, eventually auth/profile), and
building/reviewing one feature at a time (per our workflow) maps naturally onto
folders organized the same way. It also keeps everything needed for one feature
in one place rather than scattered across generic `components`/`hooks`/`utils`
folders.

```
src/
  /app                      ← Next.js routes (App Router)
  /features
    /library
      BookCard.tsx
      LibraryGrid.tsx
      mockBooks.ts
    /book-detail             ← created when this feature is started, not before
    /story-export             ← created when this feature is started, not before
  /components/ui            ← truly shared, generic UI pieces (Button, Modal, etc.)
  /lib                       ← shared utilities, API clients, etc.
```

Do not pre-create empty folders for features that haven't been started yet —
add a feature folder when work on that feature actually begins.

## Conventions

- TypeScript throughout the frontend — type props, state, and data shapes
  explicitly rather than relying on inference alone for anything
  component-facing (e.g. define a `Book` type and reuse it, don't inline
  loose object shapes per component).
- Presentational components only in `src/features/*` and equivalent future
  directories — props in, render out, no data fetching inside.
- Flag any new dependency before installing it — don't silently add packages.
- After any visual/UI change, do not declare it "done" based on absence of
  console errors alone — visual correctness must be confirmed by the developer
  looking at it.

## How Claude Code should work with the developer

- **Always explain the plan before writing non-trivial code.** Describe the
  approach, components involved, and key decisions, and wait for confirmation
  before implementing. "Non-trivial" = anything beyond a trivial styling tweak
  or one-line fix — new components, new logic, new libraries, architectural
  choices.
- **Work in small, reviewable chunks.** Don't build multiple features in one
  pass (e.g. don't build grid + filtering + 3D modal together) — build one
  piece, let the developer review, then proceed.
- **Explain code when asked, in-session, grounded in the actual files.** The
  developer will frequently ask "why did you do this" / "explain this part" —
  treat these as core to the workflow, not interruptions. Answer using the
  actual code just written, pointing to specific lines/files.
- **Run the dev server and verify no errors before reporting a task complete.**
- **Commit at clean checkpoints with descriptive messages** so changes can be
  reviewed or reverted easily.
- **Scope changes narrowly.** If asked to fix or build one thing, don't modify
  unrelated files or "improve" things that weren't asked for.

## When to update this file

Update CLAUDE.md when a **decision** changes — new architecture, new
convention, new major dependency. Do NOT use this file as a progress log;
routine progress is tracked via git history, not here.
