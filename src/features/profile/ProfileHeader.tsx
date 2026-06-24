"use client";

import { useState } from "react";
import type { Profile } from "./types";

interface ProfileHeaderProps {
  profile: Profile;
}

/** The shareable "front door" of a Kitab library. Presentational only — it
    takes a Profile and renders it; it owns one scrap of local UI state (whether
    the avatar image failed to load) purely to drive the initial-letter fallback,
    not to fetch or derive any data. */
export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const {
    username,
    displayName,
    bio,
    avatarUrl,
    booksReadCount,
    favoriteGenre,
  } = profile;

  // Show the initial-letter fallback if there's no URL, or if the image 404s.
  const [imgFailed, setImgFailed] = useState(false);
  const showFallback = avatarUrl.trim() === "" || imgFailed;
  const initial = displayName.trim().charAt(0).toUpperCase() || "·";

  const profileUrl = `kitab.com/u/${username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
    } catch {
      // Clipboard can be blocked (insecure context / denied permission). The
      // URL stays selectable as a manual fallback, so we fail quietly.
    }
  };

  return (
    <header
      className="w-full px-5 py-8 sm:px-8 sm:py-12"
      style={{
        // Warm dark spotlight from the top-right, where the avatar sits — not a
        // cold flat black, so the header reads as an intentional surface.
        background:
          "radial-gradient(ellipse at 60% 0%, #1a1410 0%, #0a0908 60%)",
        borderBottom: "0.5px solid rgba(201, 151, 58, 0.2)",
      }}
    >
      {/* Top row: identity on the left, avatar on the right. */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
            {displayName}
          </h1>
          <p
            className="mt-1 font-sans text-[0.8rem] tracking-wide"
            style={{ color: "#9a7a3a" }}
          >
            @{username}
          </p>
          <p
            className="mt-3 max-w-prose font-sans text-sm leading-relaxed"
            style={{ color: "#a89880" }}
          >
            {bio}
          </p>
        </div>

        {/* Avatar: circular image, or a dark circle with the user's initial. */}
        <div className="shrink-0">
          {showFallback ? (
            <div
              aria-label={`${displayName} avatar`}
              className="flex h-28 w-28 items-center justify-center rounded-2xl font-serif text-4xl sm:h-32 sm:w-32 sm:text-5xl"
              style={{
                background: "#15110d",
                color: "var(--accent)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
              }}
            >
              {initial}
            </div>
          ) : (
            <img
              src={avatarUrl}
              alt={`${displayName} avatar`}
              onError={() => setImgFailed(true)}
              className="h-28 w-28 rounded-2xl object-cover sm:h-32 sm:w-32"
              style={{ boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)" }}
            />
          )}
        </div>
      </div>

      {/* Stats: two minimal blocks, divided by a thin gold rule. */}
      <div className="mt-8 flex items-stretch gap-6">
        <Stat label="Books Read" value={String(booksReadCount)} />
        <div
          aria-hidden
          className="self-stretch"
          style={{ width: "1px", background: "rgba(201, 151, 58, 0.25)" }}
        />
        <Stat label="Favorite Genre" value={favoriteGenre} />
      </div>

      {/* Profile link: selectable plain text, with a copy button beside it. */}
      <div className="mt-6 flex items-center gap-3">
        <span
          className="select-text font-sans text-xs"
          style={{ color: "#5a5048" }}
        >
          {profileUrl}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy profile link"
          className="rounded-md px-2 py-1 font-sans text-[0.6rem] uppercase tracking-[0.12em] transition-all outline-none hover:bg-white/5 active:scale-90 active:bg-accent/15 focus-visible:ring-1 focus-visible:ring-accent"
          style={{ color: "#6b6355" }}
        >
          Copy
        </button>
      </div>
    </header>
  );
}

/** A single label/value stat. No card or box — just clean stacked text. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="font-sans text-[0.625rem] uppercase tracking-[0.12em]"
        style={{ color: "#6b6355" }}
      >
        {label}
      </span>
      <span className="font-sans text-xl font-normal text-foreground">
        {value}
      </span>
    </div>
  );
}
