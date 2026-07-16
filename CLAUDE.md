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

**Core app, auth, profiles, avatar upload, and S3 cover-image storage built;
not yet deployed.** The full stack is connected: Express API running in
`server/`, Postgres via Docker, Next.js frontend wired to the real API. Book
CRUD, JWT auth, public profile pages at `/[username]`, S3/CloudFront avatar
upload, and S3/CloudFront book-cover ingest are all built — see the "Auth"
and "Image storage & CDN" sections below for the locked-in architecture.
Avatar upload is verified end-to-end against real AWS, including the browser
upload flow (the S3 bucket needed a CORS configuration allowing the presigned
PUT from the frontend origin — curl-testing the endpoints alone hadn't caught
this, since curl doesn't exercise CORS preflight). Book-cover ingest
(`getOrIngestCover`, wired into `POST /api/books`) had a bug (fixed 2026-07-11)
that made `book_covers` silently empty this whole time — see "Image storage &
CDN" below. A new feature, user-submitted "custom books" shared across all
users (schema, upload pipeline, search merge, and the add-book UI), then
surfaced a much harder problem: WebGL texture loads (the live 3D detail view
and the story-export renderer) require `crossOrigin`, which makes every cover
load a cross-site CORS-mode request to CloudFront whenever `textureUrl` isn't
an Open-Library fallback. That request pattern proved unreliable in the
browser in ways that were never fully root-caused despite CloudFront's config
checking out correctly (CORS headers present, correct, singular) at every
layer tested via curl — spanning a CloudFront response-headers policy fix, a
suspected-then-ruled-out ad-blocker, suspected-then-ruled-out browser/CDN
cache poisoning, and other dead ends over several days (2026-07-11 to 07-16).
Resolved 2026-07-16 not by continuing to chase the exact cause, but by
eliminating the cross-origin request entirely: `next.config.ts` proxies
CloudFront through this app's own origin (`/media/*`), and `src/lib/mediaUrl.ts`
rewrites CloudFront URLs to that same-origin path before any texture load —
see "Image storage & CDN" and Book3D.tsx's comment for the full reasoning.
Requires `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` in `.env.local` (frontend), no
hardcoded fallback. Next milestone is deployment (Vercel + Railway/Render).

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

## Auth (locked in, with reasoning)

- **JWT in `localStorage`, not httpOnly cookies.** Originally built with
  httpOnly cookies set via Next.js route handler proxies (browser → Next
  route handler → Express), but pivoted away from that: cookies can't be
  forwarded cross-origin from client-side writes without a proxy in front of
  every single mutating endpoint, which meant a full duplicate route layer in
  Next.js for no real benefit. The JWT is now stored in `localStorage`
  (`src/lib/auth.ts`) and sent as a `Bearer` header directly to Express from
  anywhere client-side — no proxy hop needed. The logged-in user object
  (`{ id, username, displayName }`) is cached in `localStorage` alongside the
  token, so pages can check "is this me?" (e.g. showing edit controls)
  without decoding the JWT.
- **Manual JWT + bcrypt, not Lucia/Auth.js.** Deliberate choice for maximum
  learning — same reasoning as the raw-SQL DB layer. `server/src/lib/jwt.ts`
  signs/verifies 7-day tokens; `server/src/middleware/requireAuth.ts` reads
  the `Bearer` header and attaches `req.user`.
- **Route auth model:** book CRUD (`/api/books`) requires auth and scopes to
  `req.user.userId`. Profile/library reads are public
  (`GET /api/users/:username`, `GET /api/users/:username/books`) so a shared
  profile link works for any visitor; profile/avatar writes
  (`PATCH /api/users/me`, `POST`/`PATCH /api/users/me/avatar`) are auth-gated
  and scoped to the authenticated user's own row.
- **Single page for owner and visitors — no separate private "home" page.**
  `/[username]` is the only library route. `/` is a pure client-side redirect
  (to `/${username}` if a user is stored locally, else `/login`) with no UI
  of its own. `isOwner` (`currentUser?.username === username`, read from
  `localStorage`) is computed once at the page level and threaded down
  through `ProfileHeader` → `LibraryView` → `LibraryGrid` / `BookDetailModal`
  to gate add/edit/delete and profile-editing UI. This is presentational
  only — the real security boundary is Express independently rejecting
  unauthenticated or mismatched-user writes; hiding a button client-side is
  never the actual control.

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
  - **Profile photos** (built): client requests a presigned PUT URL from
    Express (auth-gated, rate-limited 10/15min per user), uploads directly to
    a raw key (`avatars/raw/{userId}/{randomUUID}`), then confirms with the
    key. Express fetches the raw upload back from S3, resizes it via `sharp`
    to a single 256×256 WebP thumbnail (`fit: cover`, quality 82 — WebP over
    JPEG so a transparent PNG upload isn't flattened to a solid background),
    publishes it to a new serving key, updates `avatar_url` to the CloudFront
    URL, and best-effort deletes both the raw object and any previous avatar
    (a cleanup failure doesn't fail the request — the new avatar is already
    live by that point). A fresh random key per upload means a replaced
    avatar naturally gets a new CDN URL, so no cache invalidation is needed.
    The confirm endpoint also rejects any key not prefixed with the
    requesting user's own `avatars/raw/{userId}/` namespace — otherwise a
    client could hand the server another user's raw upload key.
  - **Book covers** (built; fetch/ingest bug fixed 2026-07-11, WebGL loading
    fixed via same-origin proxy 2026-07-16 — see "Current phase"): fetched
    server-side from Open Library by ISBN at insert/ingest time (not
    client-uploaded), deduplicated by ISBN
    so a book owned by multiple users is stored once, resized via `sharp`
    into two variants (grid thumbnail, 3D texture res), uploaded to S3, and
    the resulting URLs stored on the book row instead of linking Open Library
    directly. Falls back to linking Open Library directly on ingest failure —
    see `coverUrl`/`textureUrl` notes
    in "Data layer" below.
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
  textureUrl: string; // larger variant for the 3D render; falls back to coverUrl for pre-ingest-pipeline rows
  spineColor: string | null; // raw dominant color computed at ingest; re-lit into the final tint by relightSpineColor
  dateStarted: string;
  dateFinished: string;
  bookNumber: number; // derived in getBooks (by date_finished order), not stored/returned by the API
  quote: string;
};
```

**Cover URLs** are S3/CloudFront, ingested once per unique ISBN at insert time
via `getOrIngestCover` (see "Image sourcing" above) — never a user-supplied
URL. `book_covers` is the ISBN-keyed cache; `books.cover_url` /
`books.cover_texture_url` are copied from it on insert. Falls back to linking
`https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg` directly if ingest fails.

**API surface (Express, `server/src/routes/`):**

- `POST /api/auth/register` / `POST /api/auth/login` — returns `{ token, user }`
- `GET /api/books` — the authenticated user's library (auth-gated, scoped to
  `req.user.userId`), ordered by `date_finished, created_at, id`
- `POST /api/books` — add a book; body: `{ title, author, isbn?, customBookId?, dateStarted?, dateFinished?, quote? }`,
  exactly one of `isbn`/`customBookId` required (auth-gated)
- `PATCH /api/books/:id` — update quote only; body: `{ quote }` (auth-gated)
- `DELETE /api/books/:id` — remove a book (auth-gated)
- `GET /api/book-search?q=` — merges `custom_books` (ILIKE, capped at 5, listed first) with the Open
  Library proxy; returns `{ source: "openlibrary", title, author, isbn, coverUrl }[] | { source: "custom", title, author, customBookId, coverUrl }[]`
- `POST /api/custom-books/cover` — issues a presigned S3 upload URL for a candidate custom-book cover (auth-gated, rate-limited)
- `POST /api/custom-books` — confirms the upload, resizes + extracts spine color, creates the shared catalog entry;
  body: `{ title, author, key }` (auth-gated); no PATCH/DELETE — immutable once created
- `GET /api/users/:username` — public profile (404 if unknown)
- `GET /api/users/:username/books` — public library for a username, no auth
- `PATCH /api/users/me` — update `displayName`/`bio` (auth-gated)
- `POST /api/users/me/avatar` — issues a presigned S3 upload URL (auth-gated, rate-limited)
- `PATCH /api/users/me/avatar` — confirms + resizes the upload, finalizes `avatar_url` (auth-gated)

**Frontend data modules** (all presentational — components take props, never
fetch directly):

- `src/features/library/booksApi.ts` — `getPublicBooks(username)`, client-side,
  used by both the owner and visitors on `/[username]`; assigns `bookNumber`
  by position
- `src/features/add-book/addBookApi.ts` — `searchBooks()` + `addBook()`,
  client-side (CORS-enabled, uses `NEXT_PUBLIC_API_URL`)
- `src/features/book-detail/bookDetailApi.ts` — `updateBookQuote()` +
  `deleteBook()`, client-side
- `src/features/profile/profileApi.ts` — `getProfile()` + `updateProfile()` +
  `requestAvatarUpload()` + `uploadAvatarFile()` + `confirmAvatarUpload()`, client-side
- `src/lib/auth.ts` — `getStoredToken`/`setStoredToken`/`clearStoredToken` +
  `getStoredUser`/`setStoredUser`/`clearStoredUser`, the `localStorage` layer
  underneath the auth model described above

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
- **3D book spine/back color (built):** The spine and back faces are tinted
  from the cover's dominant hue (not a flat average, which comes out muddy
  gray), then re-lit to a fixed dark, rich value so they read as the book's
  edges rather than competing with the cover face. Grayscale covers fall back
  to a darkened average; a missing color falls back to the dark default.
  Computed server-side at ingest time (`server/src/lib/spineColor.ts`, via
  `sharp` — Node has no DOM canvas), stored as the raw dominant color (not the
  already-re-lit spine color, so dark/vivid styling can be tuned on the
  frontend without re-ingesting every book) on `book_covers`, `custom_books`,
  and `books` (mirroring `cover_url`/`texture_url`'s caching pattern — see
  "Data layer"). The frontend (`src/lib/coverColor.ts`'s `relightSpineColor`)
  just re-lights that stored value — pure color math, no image access needed.
  This replaced an earlier client-side canvas-read implementation
  (`deriveSpineColor`), motivated initially by an ad-blocker/CORS problem (see
  "Image sourcing" below) — moving the *extraction* server-side didn't fully
  solve that problem on its own, since displaying the texture at all still
  needs `crossOrigin`, but it's a real improvement kept regardless: no async
  pixel-read, identical color between the live 3D view and the story-export
  render, and the dominant-hue algorithm only needs to live in one place
  conceptually (ported 1:1 from canvas to `sharp`, same tuning constants).
- **Image sourcing (built):** Cover images are fetched once per unique ISBN at
  ingest time (`server/src/lib/coverIngest.ts`, called from `POST /api/books`),
  resized via `sharp` into two variants (500×750 grid, 1000×1500 3D texture),
  and cached in `book_covers` (keyed by ISBN) so a book added by multiple users
  is only fetched/resized/uploaded once. Falls back to linking Open Library
  directly on any fetch/resize failure, so adding a book never fails because
  of the cover pipeline. Had a bug (fixed 2026-07-11) where it fell back on
  every single ISBN because Open Library's HTTP/2 responses never send a
  `content-length` header, and the size check relied on that header instead
  of the actual downloaded bytes — `book_covers` was empty this whole time.
  A second, harder problem surfaced once real CloudFront-hosted covers
  existed: WebGL requires `crossOrigin` to display *any* cross-origin texture
  at all (`texImage2D` throws `SecurityError` and refuses the upload
  without it — unlike canvas 2D, which tolerates a tainted source for
  drawing and only blocks pixel-reads), which makes every 3D cover load a
  cross-site CORS-mode request. That request pattern proved unreliable in
  the browser in ways never fully root-caused despite CloudFront's config
  checking out correctly at every layer tested via curl (CORS headers
  present, correct, singular) — several dead-end theories were chased in
  turn (a missing CloudFront response-headers policy, an ad-blocker,
  CDN/browser cache poisoning) over 2026-07-11 to 07-16. **Resolved by
  eliminating the cross-origin request entirely**, not by continuing to
  chase the exact cause: `next.config.ts` proxies CloudFront through this
  app's own origin (`/media/*`), and `src/lib/mediaUrl.ts` rewrites
  CloudFront-hosted URLs to that same-origin path before any WebGL texture
  load (`Book3D.tsx`, `renderBook.ts`). A same-origin request is never
  subject to CORS, so this closes the entire class of problem — including
  the original "some users have ad-blockers" concern — rather than
  depending on CloudFront/browser CORS behavior being correct. Requires
  `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` set in the frontend's `.env.local` (no
  hardcoded fallback — see `next.config.ts`'s comment for why).

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

## Library page (`/[username]`)

`src/app/[username]/page.tsx` — the single route for a user's library,
whether it's being viewed by its owner or any visitor (see the "Auth"
section above for the `isOwner` reasoning). A client component: fetches
`getProfile(username)` and `getPublicBooks(username)` in parallel on mount,
computes `isOwner`, and renders a not-found state if the profile fetch
returns null. Renders `ProfileHeader` (identity, avatar, owner-only edit
triggers) and `LibraryView` (the grid + detail modal, owner-only add/edit/
delete). Shareable as-is by anyone, since the underlying data fetches are
public endpoints.

## Folder structure

**Feature-based, not type-based.** Group files by what feature/domain they
belong to, not by file type. Reason: this project has a small number of clear
features (library, book detail, story export, add-book, profile), and
building/reviewing one feature at a time (per our workflow) maps naturally onto
folders organized the same way. It also keeps everything needed for one feature
in one place rather than scattered across generic `components`/`hooks`/`utils`
folders.

```
src/
  /app
    page.tsx                ← pure redirect: /${username} if logged in, else /login
    layout.tsx
    /login
      page.tsx
    /register
      page.tsx
    /[username]
      page.tsx              ← the single library page (client component), owner + visitors
  /features
    /library
      BookCard.tsx
      LibraryGrid.tsx        ← owner-only add-book tile
      LibraryView.tsx        ← client coordinator: owns selected-book state
      mockBooks.ts           ← Book type + (unused) mock array
      booksApi.ts            ← getPublicBooks() — client-side
    /add-book
      AddBookButton.tsx       ← grid-tile trigger; modal portaled to document.body
      AddBookModal.tsx        ← search phase → details phase → POST /api/books
      addBookApi.ts           ← searchBooks() + addBook() — client-side
    /book-detail
      BookDetailModal.tsx    ← isOwner-gated quote editing + delete + "Share to story"
      Book3D.tsx
      BookScene.tsx
      bookDetailApi.ts       ← updateBookQuote() + deleteBook() — client-side
    /story-export
      ExportModal.tsx        ← offscreen render → preview → copy/download
      StoryExportCard.tsx    ← the 1080×1920 card layout
      renderBook.ts          ← offscreen WebGLRenderer pipeline
    /profile
      ProfileHeader.tsx       ← isOwner-gated edit-profile + change-photo triggers
      EditProfileModal.tsx    ← displayName/bio only
      AvatarUploadModal.tsx   ← dedicated avatar upload, separate from EditProfileModal
      profileApi.ts
      types.ts
  /lib
    auth.ts                  ← localStorage token/user helpers
    coverColor.ts             ← relightSpineColor: pure color math on the server-computed raw spine color
    mediaUrl.ts                ← toMediaUrl: rewrites CloudFront URLs to the same-origin /media proxy
server/
  /src
    app.ts                   ← Express app factory
    index.ts                 ← server entrypoint
    db.ts                    ← pg pool
    /lib
      jwt.ts                  ← sign/verify JWT
      s3.ts                   ← S3Client + bucket/CloudFront constants
      coverIngest.ts           ← getOrIngestCover: fetch/resize/upload/dedupe covers by ISBN
      coverResize.ts            ← resizeCoverVariants: shared sharp resize, used by coverIngest + customBooks
      spineColor.ts            ← extractRawSpineColor: sharp-based dominant-hue extraction at ingest
    /middleware
      requireAuth.ts          ← reads Bearer token, attaches req.user
    /types
      express.d.ts             ← augments Express Request with req.user
    /routes
      auth.ts                  ← POST /register, POST /login
      books.ts                 ← auth-gated, scoped to req.user
      bookSearch.ts             ← GET ?q= (Open Library proxy + custom_books, merged)
      users.ts                  ← profile reads (public) + profile/avatar writes (auth-gated)
      customBooks.ts             ← presigned cover upload + create for user-submitted books
  /db
    01_schema.sql
    02_seed.sql
    03_users.sql              ← users table + user_id FK on books
    04_dev_seed.sql           ← dev user cecildev
    05_book_covers.sql         ← book_covers cache table + books.cover_texture_url
    06_custom_books.sql         ← custom_books table + books.custom_book_id
    07_spine_color.sql          ← spine_color on book_covers, custom_books, books
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
- **Never read or edit `server/.env` directly.** Blocked via
  `.claude/settings.local.json` deny rules (`Read(.env)`, `Read(.env.*)`) —
  this is deliberate, not a gap to route around. The developer handles all
  `.env` edits themselves. When a task needs an env var added or changed,
  tell them the exact key and value to set — don't ask them to paste secrets
  back into chat. `.env.example` (the committed, secret-free template) stays
  fully editable by Claude Code and should be kept in sync whenever a new
  required env var is introduced.

## What's next (post-V1)

In rough priority order:

1. **Deployment** — Vercel (frontend) + Railway or Render (Express). Env vars
   to wire: `API_URL` (server-side) and `NEXT_PUBLIC_API_URL` (client-side)
   pointing at the deployed Express URL; `FRONTEND_ORIGIN` on Express pointing
   at the Vercel URL.
2. **Spine color at ingest** — Move dominant-hue extraction server-side (via
   `sharp`) and store it as a `spineColor` field on the book, so the frontend
   reads it from props instead of computing it client-side on every load. Now
   natural to build alongside `coverIngest.ts`, since that's already where the
   cover bytes are fetched/resized server-side.
4. **"Share to Instagram"** — Web Share API on mobile. Placeholder comment
   already in `ExportModal.tsx`.

## When to update this file

Update CLAUDE.md when a **decision** changes — new architecture, new
convention, new major dependency. Do NOT use this file as a progress log;
routine progress is tracked via git history, not here.
