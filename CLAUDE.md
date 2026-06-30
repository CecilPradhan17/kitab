# Project: Kitab

## App name

**Kitab** — Nepali (and Arabic/Urdu/Hindi) for "book." This name appears
as the watermark on every story export card, in page titles, and eventually
in all meta tags. Do not substitute or abbreviate it. Render as "Kitab"
in regular casing for UI, "KITAB" in small-caps for the export card watermark.

## What this is

A web app for tracking books read, displayed as an aesthetically premium
personal library. Each book has a 3D interactive model (shown on click, not
in the grid). Users can share a public profile link of their library. Users
can export a cinematic Instagram-Story-style card of a book they just finished
(inspired by Strava's run-sharing feature) — dark background, 3D book render,
gold accents, metadata, and a quote — downloadable as a PNG for sharing.

## Goals (for Claude Code to keep in mind)

1. This is a portfolio/resume project — code quality and the ability for the
   developer to explain every decision in an interview matters as much as
   shipping speed.
2. The developer wants to learn while building, not just receive finished code.
3. Visual/UX quality is the primary unproven risk of this project. Functional
   correctness alone is not "done" — things must also look and feel premium.

## Current phase

**V1 feature-complete, not yet deployed.** The full stack is connected:
Express API running in `server/`, Postgres via Docker, Next.js frontend wired
to the real API. All core CRUD flows are built and working locally. Next
milestone is deployment (Vercel + Railway/Render), followed by auth/profiles.

## Backend decisions (locked in, with reasoning)

- **Express, not Next.js route handlers.** Next.js route handlers could
  technically serve this app's CRUD needs more simply (shared types, one
  deploy). Express was chosen deliberately because this is a portfolio project
  meant to demonstrate full-stack range — building a standalone REST API is a
  stronger, more explicit backend signal than framework-coupled route handlers,
  and a long-running server holds a clean Postgres connection pool (serverless
  route handlers need external pooling). The value is the demonstration, not a
  functional necessity — and being able to articulate that tradeoff is itself
  the point.
- **Repo layout:** `server/` folder in this same repo, with its own
  `package.json`/`tsconfig.json` (independent deps, deployable on its own to
  Railway/Render while Vercel hosts the frontend). Not a separate repo —
  unnecessary overhead for a solo project.
- **DB layer: raw `pg` + hand-written SQL.** No ORM. Chosen for maximum
  learning and explainability — we want to actually know SQL and exactly what
  hits the database, not an ORM's DSL. More boilerplate (manual types and
  migrations) is the accepted cost.
- **Local Postgres via Docker** (docker-compose), so dev mirrors prod and
  nothing is installed system-wide.
- **Book number is derived, not stored.** There is no `book_number` column.
  `GET /api/books` returns books ordered by `date_finished` (tiebreak
  `created_at`, then `id`), and the frontend assigns the number by position in
  `getBooks` (#1 = earliest finished). Reason: a stored sequence forces resequencing
  on every insert/delete (and `MAX+1` bookkeeping on insert); deriving it makes
  delete a single-row delete and insert a plain insert, with numbering always
  consistent. `created_at TIMESTAMPTZ DEFAULT now()` exists only as the tiebreaker.
  Trade-off: inserting a back-dated book shifts the displayed numbers of books
  after it — acceptable, since the number is positional by definition.
- **TypeScript config:** CommonJS module output (avoids the `.js`-extension-in-
  imports gotcha while learning); `strict` on. Dev runs via `tsx watch`;
  production path is `tsc` build → `node dist`.

## Image storage & CDN (locked in, with reasoning)

- **Object storage: AWS S3.** Chosen over Cloudflare R2/Supabase Storage
  deliberately for the AWS learning/resume signal — this project's stated
  future milestone is AWS migration, so S3 now is consistent with that
  direction rather than adding a second migration later.
- **CDN: CloudFront in front of S3, from day one — not a later optimization.**
  The bucket is NOT publicly readable directly; access is restricted to
  CloudFront via Origin Access Control (OAC). Reasoning: same-region
  S3-to-CloudFront transfer is free, CloudFront's own egress is cheaper than
  direct S3-to-internet egress, and caching absorbs repeat requests (a
  popular shared profile or book cover) instead of re-billing S3 egress on
  every view. A public bucket with no CDN is also the main cost-abuse vector
  (hotlinking, traffic spikes) — CloudFront closes that, it does not add to
  the bill.
- **Two asset types, same pattern (presigned upload, never proxy through Express):**
  - **Profile photos**: client requests a presigned PUT URL from Express
    (auth-gated — only a logged-in user can request one for their own
    user id), uploads directly to S3, then tells the API the resulting
    object key to store on the `users` row. Resized server-side via `sharp`
    to a single small thumbnail variant.
  - **Book covers**: fetched server-side from Open Library by ISBN at
    insert/ingest time (not client-uploaded), deduplicated by ISBN so a
    book owned by multiple users is stored once, resized via `sharp` into
    two variants (grid thumbnail, 3D texture res), uploaded to S3, and the
    resulting URLs stored on the book row instead of linking Open Library
    directly. Supersedes the old "link Open Library directly" approach —
    see updated `coverUrl` note below.
- **IAM scoping:** Express's S3 credentials are scoped to
  `PutObject`/`GetObject` on this bucket only — never root/account-wide
  credentials.
- **Cost controls (set up before any upload endpoint goes live):**
  - AWS Budget + alert configured at account creation (low threshold, e.g. $5/$20).
  - File-size and content-type validated server-side before issuing a
    presigned URL (client-side validation alone is not a control).
  - Rate limiting on the upload-URL-issuing endpoint.
  - Presigned URLs are short-lived and only ever issued to an authenticated
    user for their own resource.
- **Cost shape at current scale (≤500 users):** storage and request costs
  are negligible (~$0.05–0.20/month combined). Egress is the only line that
  scales, and at this user count realistically stays inside AWS's always-on
  100GB/month free internet egress tier even without CloudFront's caching
  helping further — so expect close to $0/month, not a line to optimize
  prematurely. Revisit storage class (e.g. Intelligent-Tiering) only if
  usage patterns change at meaningfully larger scale.

## Tech stack (decided, do not change without discussion)

- **Frontend:** Next.js (App Router), React, **TypeScript**, Tailwind CSS.
  Project uses a `src/` directory (`src/app/`, etc.). All component files use
  `.tsx` (or `.ts` for non-component logic/utilities), not `.js`/`.jsx`.
- **3D:** Three.js via React Three Fiber (`@react-three/fiber`) +
  `@react-three/drei` (helpers) + `@react-three/postprocessing` (bloom/glow effects)
- **Image export:** Hybrid pipeline — offscreen `WebGLRenderer` at 1080×1920
  captures the Three.js book render as a base64 PNG, which is then injected
  as a `background-image` into a hidden HTML export card div; `html-to-image`
  captures the full div (book render + styled metadata/quote overlay) as the
  final PNG. Client-side only, no server rendering. `preserveDrawingBuffer: true`
  is required on the export renderer or `toDataURL()` returns blank.
- **Backend:** Express + Node + TypeScript + PostgreSQL (built, running in `server/`)
  **Hosting (not yet deployed):** Railway or Render for the backend; Vercel for the
  Next.js frontend. **Image storage is on AWS now** (S3 + CloudFront — see
  "Image storage & CDN" section), decided ahead of the broader AWS migration
  because it's needed for profiles/auth. Full backend AWS migration remains a
  deliberate later milestone, not a V1 goal.
- **Package manager:** npm
- **Fonts:** Playfair Display (or DM Serif Display) for titles/serif moments,
  Inter for UI/labels (small-caps style, wide letter-spacing for metadata labels)
- **Color accent:** warm gold (~#C9973A) as the brand accent, dark/near-black
  backgrounds throughout

## Data layer

**The `Book` type** is defined in `src/features/library/mockBooks.ts` (file kept
for the type export; the mock array itself is no longer used for rendering).
Shape:

```ts
type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  dateStarted: string;
  dateFinished: string;
  bookNumber: number; // derived in getBooks (by date_finished order), not stored/returned by the API
  quote: string;
};
```

**Cover URLs** are Open Library by ISBN —
`https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg` — derived by the server
at insert time from the ISBN the client sends. Never stored as a user-supplied
URL.

**API surface (Express, `server/src/routes/`):**

- `GET /api/books` — full library, ordered by `date_finished, created_at, id`
- `POST /api/books` — add a book; body: `{ title, author, isbn, dateStarted?, dateFinished?, quote? }`
- `PATCH /api/books/:id` — update quote only; body: `{ quote }`
- `DELETE /api/books/:id` — remove a book
- `GET /api/book-search?q=` — proxies Open Library search, returns `{ title, author, isbn, coverUrl }[]`

**Frontend data modules** (all presentational — components take props, never
fetch directly):

- `src/features/library/booksApi.ts` — `getBooks()`, runs server-side (RSC),
  assigns `bookNumber` by position
- `src/features/add-book/addBookApi.ts` — `searchBooks()` + `addBook()`,
  client-side (CORS-enabled, uses `NEXT_PUBLIC_API_URL`)
- `src/features/book-detail/bookDetailApi.ts` — `updateBookQuote()` +
  `deleteBook()`, client-side

## Architecture decisions (locked in, with reasoning)

- **Hybrid 2D/3D rendering:** The library grid uses flat 2D cover cards (image +
  CSS glow), NOT live 3D objects. Full 3D is only rendered on-demand when a user
  clicks into a single book. Reason: rendering many simultaneous 3D objects
  causes GPU/memory issues at scale (high draw calls, large texture memory).
  2D-grid-then-3D-detail avoids this entirely while still delivering the "wow"
  moment where it matters most.
- **Card glow effect:** Each book card has a single, uniform brand-gold
  underglow (#C9973A). We deliberately decided NOT to extract a per-cover color
  (e.g. via `fast-average-color`) — a consistent gold glow reinforces the brand
  and keeps the grid visually calm. Do not reintroduce dynamic color extraction
  in the grid. The glow is a thin, heavily-blurred horizontal ellipse positioned
  at the bottom edge of the card only (not a diffuse ambient bloom around the
  whole card), narrower than the card width, simulating light pooling under the
  book's base. This is a CSS `::after` pseudo-element, not a JS effect.
  (Per-cover color extraction IS used in the 3D detail view — see spine color
  below. The two are intentionally different: the grid stays brand-consistent
  because many books share the screen; the detail view shows one book at a time,
  where per-book color reads as realism, not noise.)
- **3D book model:** One reusable mesh/geometry for all books ("cookie cutter"
  approach). Only the cover texture changes per book. Do not generate unique
  geometry per book.
- **3D book spine/back color:** The spine and back faces are tinted from the
  cover's dominant hue (not a flat average, which comes out muddy gray), then
  re-lit to a fixed dark, rich value so they read as the book's edges rather
  than competing with the cover face. Grayscale covers fall back to a darkened
  average; a failed read falls back to the dark default. Currently computed
  client-side from the loaded cover texture (canvas downscale → dominant-hue
  vote → re-light). Moving this to ingest-time is a future milestone — see
  spine color note below.
- **Image sourcing (future, not yet built):** Cover images currently come from
  Open Library by ISBN, linked directly. Future plan: fetch once per unique
  ISBN at ingest time, cache in our own storage, serve two variants (small for
  grid, large for 3D texture). Not yet implemented.
- **Spine color computed at ingest (future, not yet built):** When the backend
  ingests a book and fetches its cover, it will also compute the cover's dominant
  color and store it as a field on the book (e.g. `spineColor` on the `Book`
  type). The frontend then reads this via props and drops the client-side
  extraction entirely. Store the raw dominant hue, not the already-re-lit spine
  color, so dark/vivid styling can be tuned on the frontend without re-ingesting
  every book. Server-side the algorithm uses `sharp` (Node has no DOM canvas);
  the approach (downscale → dominant hue) carries over. Future phase only.

## Story export feature spec (src/features/story-export)

The export card is the app's primary viral/sharing loop. Quality here matters
enormously — it is what people will see on Instagram Stories.

**Visual composition (9:16, 1080×1920px):**

- Near-black background (`#080706`)
- Subtle warm radial glow at top center (very faint, not dramatic)
- 3D book render as hero element, upper half of card, slightly tilted
  (rotateY ~-22deg, rotateX ~3deg), with spine face and page-edge face visible
- Gold underglow beneath the book base
- Book title in Playfair Display, white, centered below the book
- Author in Inter, gold (#C9973A), small, below title
- Thin gold-tinted divider line
- Three metadata columns (Started / Finished / Book #), small-caps Inter labels,
  light body text
- Thin gold-tinted divider line
- Large gold quotation mark, italic Playfair Display quote in muted warm white
- "KITAB" watermark at bottom in small-caps Inter, flanked by thin divider lines

**Export pipeline:**

1. Spin up offscreen `WebGLRenderer` at 1080×1920 with `preserveDrawingBuffer: true`
2. Clone existing book geometry + load cover texture at high res
3. Fixed camera angle + cinematic lighting (not interactive, not user-controlled)
4. `renderer.render(scene, camera)` → `canvas.toDataURL('image/png')` → base64
5. Inject base64 as CSS `background-image` on hidden export card div
6. `html-to-image` captures full div at 1080×1920
7. Result shown in preview modal

**UX flow:**

- User clicks "Share to story" on a book from the book detail modal
- Loading state shown while offscreen renderer initializes (~0.5–2s) — do not
  skip the loading indicator or the experience feels broken
- Preview modal opens showing the full export card
- The export preview is **read-only** — it renders the book's current quote
  (`book.quote`) and is NOT editable here. Quote editing lives in the book
  detail modal (single place to edit, already built). `StoryExportCard` keeps
  an optional `quote` prop for future use. No live-re-render-as-you-type.
- Two action buttons: "Copy image" / "Download PNG". "Share" is future.
- "Share to Instagram" is a future feature — do not implement now, but leave
  a clearly commented placeholder so it's obvious where it goes

**Font loading gotcha (critical):**
`html-to-image` will render fallback system fonts if Playfair Display / Inter
haven't fully loaded at capture time. Must await `document.fonts.ready` (or
explicitly load fonts via FontFace API) before triggering the capture. This is
a known failure mode — do not skip it.

## Public profile page (`/[username]`)

The route exists at `src/app/[username]/page.tsx`. Current state:

- Books are fetched from the real API (`getBooks()`), same as the home page
- The profile header (name, bio, avatar) is still mock data from
  `src/features/profile/mockProfile.ts` — the profile API and auth don't exist yet
- The `[username]` route param is intentionally ignored for now; any path
  renders the same mock profile
- The library is read-only on the public page — no add/edit/delete affordances

This page is shareable in its current form; it just always shows the same
profile until auth is built.

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
  /app
    page.tsx                ← home library (RSC, calls getBooks)
    layout.tsx
    /[username]
      page.tsx              ← public profile page (RSC; mock profile, real books)
  /features
    /library
      BookCard.tsx
      LibraryGrid.tsx
      LibraryView.tsx       ← client coordinator: owns selected-book state
      mockBooks.ts          ← Book type + (unused) mock array
      booksApi.ts           ← getBooks() — server-side RSC fetch
    /add-book
      AddBookButton.tsx
      AddBookModal.tsx      ← search phase → details phase → POST /api/books
      addBookApi.ts         ← searchBooks() + addBook() — client-side
    /book-detail
      BookDetailModal.tsx   ← quote editing + delete + "Share to story" trigger
      Book3D.tsx
      BookScene.tsx
      bookDetailApi.ts      ← updateBookQuote() + deleteBook() — client-side
    /story-export
      ExportModal.tsx       ← offscreen render → preview → copy/download
      StoryExportCard.tsx   ← the 1080×1920 card layout
      renderBook.ts         ← offscreen WebGLRenderer pipeline
    /profile
      ProfileHeader.tsx
      mockProfile.ts        ← placeholder until profile API exists
      types.ts
  /lib
    coverColor.ts           ← dominant-hue extraction for 3D spine tint
server/
  /src
    app.ts                  ← Express app factory
    index.ts                ← server entrypoint
    db.ts                   ← pg pool
    /routes
      books.ts              ← GET / POST / PATCH /:id / DELETE /:id
      bookSearch.ts         ← GET ?q= (Open Library proxy)
  /db
    01_schema.sql
    02_seed.sql
  docker-compose.yml
```

Do not pre-create empty folders for features that haven't started yet.

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
- When writing commit messages, do NOT use double quotes (`"`) inside the
  message body. The developer commits with `git commit -m "..."`, and an inner
  double quote prematurely closes the shell string and breaks the command. Use
  single quotes (`'...'`) for any quoting inside the message instead.

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

## What's next (post-V1)

These are planned but not started — in rough priority order:

1. **Deployment** — Vercel (frontend) + Railway or Render (Express). Env vars
   to wire: `API_URL` (server-side) and `NEXT_PUBLIC_API_URL` (client-side)
   pointing at the deployed Express URL; `FRONTEND_ORIGIN` on Express pointing
   at the Vercel URL.
2. **Auth + profiles** — Users, login, and real `[username]` routing. The
   profile page and mock data are intentionally placeholders for this.
3. **Auth + profile photo upload** (in progress) — sessions/JWT built manually
   (deliberate choice over Lucia/Auth.js, more learning). Profile photo
   upload via S3 presigned URLs — see "Image storage & CDN" section for the
   full design.
4. **Image caching** (design locked, not yet implemented) — fetch and store
   cover images at ingest time rather than linking Open Library directly, via
   the S3 + CloudFront pipeline above. Two variants per ISBN (grid + 3D
   texture).
5. **Spine color at ingest** — Move dominant-hue extraction server-side (via
   `sharp`) and store it as a `spineColor` field on the book, so the frontend
   reads it from props instead of computing it client-side on every load.
6. **"Share to Instagram"** — Web Share API on mobile. Placeholder comment
   already in `ExportModal.tsx`.

## When to update this file

Update CLAUDE.md when a **decision** changes — new architecture, new
convention, new major dependency. Do NOT use this file as a progress log;
routine progress is tracked via git history, not here.
