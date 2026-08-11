# Kitab

**Kitab** (Nepali/Arabic/Urdu/Hindi for "book") is a web app for tracking
books read, presented as an aesthetically premium personal library.

Each book gets a 3D interactive model on click, and finished books can be
exported as a cinematic, Instagram-Story-style share card. (inspired by Strava's
run-sharing cards)

This is a portfolio project: the goal was to build a real, deployed
full-stack app while making (and being able to explain) deliberate
architecture decisions end to end, to efficiently and securely handle large amounts of image storage and processing. 

Also used by the creator to track his own books. 

**Live app:** kitab-dun.vercel.app

## Features

- Personal library grid with a 3D interactive book model per book (click to
  open — the grid itself stays flat 2D for performance at scale)
- Public shareable profile pages (`/username`) — no login required to view
- Cinematic PNG story-export cards for finished books, built from an
  offscreen WebGL render composited with a styled HTML overlay
- Auth, avatar upload, and per-book quotes, all backed by a real REST API
- User-submitted "custom books" shared catalog, for books not on Open Library
- Cover images ingested once per ISBN, resized, and served from a CDN — not
  hot-linked from a third party on every page load

## Tech stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **3D:** Three.js via React Three Fiber + drei + postprocessing (bloom/glow)
- **Backend:** Express + TypeScript + PostgreSQL, hand-written SQL (no ORM)
- **Image storage:** AWS S3 + CloudFront (Origin Access Control, not a
  public bucket)
- **Auth:** manual JWT + bcrypt (no third-party auth library)
- **Hosting:** Vercel (frontend), Render (API), Neon (Postgres)

## A few engineering decisions worth calling out

- **Express instead of Next.js route handlers.** Route handlers could serve
  this app's CRUD needs more simply, but a standalone REST API is a
  stronger backend signal for a portfolio project, and a long-running
  server keeps a clean Postgres connection pool without needing external
  pooling for serverless functions.
- **Raw SQL, no ORM.** Chosen to actually learn and be able to explain
  every query, at the cost of more manual boilerplate (types, migrations).
- **CDN in front of S3 from day one, not a later optimization** — the
  bucket itself isn't publicly readable; only CloudFront (via OAC) can read
  it. Cover images are fetched and resized once per ISBN and cached, not
  re-fetched from Open Library on every request.
- **A same-origin media proxy for WebGL textures.** Loading a cross-origin
  texture into WebGL requires CORS mode, and that request pattern turned
  out to be unreliable in the browser in ways that didn't fully
  root-cause even with correct CloudFront CORS headers. Fixed by proxying
  CloudFront through the app's own origin (`/media/*`) so the browser never
  makes a cross-origin request for a texture at all — closing the whole
  class of problem instead of chasing the exact cause.
- **Book number is derived, not stored.** There's no `book_number` column;
  it's assigned by sort position on read. A stored sequence would need
  resequencing on every insert/delete — deriving it makes both operations
  trivial and numbering always internally consistent.

## Local development

Requires Docker (for local Postgres), Node, and npm.

```bash
# Backend
cd server
cp .env.example .env   # fill in real values — see comments in the file
docker compose up -d
npm install
npm run dev             # http://localhost:4000

# Frontend (from repo root)
npm install
npm run dev              # http://localhost:3000
```

`server/.env.example` documents every required environment variable,
including which ones are safe to commit (bucket name, CloudFront domain)
versus which must stay secret (AWS keys, JWT secret, DB credentials).

## Project structure

Feature-based, not type-based — files are grouped by what they belong to
(library, book detail, story export, add-book, profile) rather than by
generic `components`/`hooks`/`utils` folders. See `CLAUDE.md` for the full
folder layout and the reasoning behind it, along with the complete set of
architecture decisions this project made and why.

## License

All rights reserved.
