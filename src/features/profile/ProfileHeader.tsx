"use client";

import { useState } from "react";
import type { Profile } from "./types";
import EditProfileModal from "./EditProfileModal";
import AvatarUploadModal from "./AvatarUploadModal";

interface ProfileHeaderProps {
  profile: Profile;
  /** Derived from the fetched books array on the page — not stored on Profile. */
  booksReadCount: number;
  /** Whether the current viewer owns this profile — gates the edit trigger.
      Computed by the page (from localStorage) and passed down, not derived here. */
  isOwner: boolean;
}

/** The shareable "front door" of a Kitab library. Takes a Profile and renders
    it; owns a local copy of it so an edit can update the view in place. */
export default function ProfileHeader({
  profile: initialProfile,
  booksReadCount,
  isOwner,
}: ProfileHeaderProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { username, displayName, bio, avatarUrl } = profile;
  const shownName = displayName?.trim() || username;

  // Show the initial-letter fallback if there's no URL, or if the image 404s.
  const [imgFailed, setImgFailed] = useState(false);
  const showFallback = !avatarUrl || imgFailed;
  const initial = shownName.charAt(0).toUpperCase() || "·";

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
            {shownName}
          </h1>
          <p
            className="mt-1 font-sans text-[0.8rem] tracking-wide"
            style={{ color: "#9a7a3a" }}
          >
            @{username}
          </p>
          {bio && (
            <p
              className="mt-3 max-w-prose font-sans text-sm leading-relaxed"
              style={{ color: "#a89880" }}
            >
              {bio}
            </p>
          )}
        </div>

        {/* Avatar: circular image, or a dark circle with the user's initial.
            Owner-only change trigger overlays the whole thing on hover/focus. */}
        <div className="relative shrink-0">
          {showFallback ? (
            <div
              aria-label={`${shownName} avatar`}
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
              src={avatarUrl ?? undefined}
              alt={`${shownName} avatar`}
              onError={() => setImgFailed(true)}
              className="h-28 w-28 rounded-2xl object-cover sm:h-32 sm:w-32"
              style={{ boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)" }}
            />
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => setIsUploadingAvatar(true)}
              aria-label="Change photo"
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 opacity-0 outline-none transition-all hover:bg-black/50 hover:opacity-100 focus-visible:bg-black/50 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="font-sans text-[0.6rem] uppercase tracking-[0.15em] text-white">
                Change
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Stats: single stat, no divider needed with favoriteGenre gone. */}
      <div className="mt-8 flex items-stretch gap-6">
        <Stat label="Books Read" value={String(booksReadCount)} />
      </div>

      {/* Profile link + copy, and (owner-only) the edit trigger. */}
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

        {isOwner && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="ml-auto rounded-full border border-accent/50 px-4 py-1.5 font-sans text-[0.6rem] uppercase tracking-[0.15em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent"
          >
            Edit profile
          </button>
        )}
      </div>

      <EditProfileModal
        profile={isEditing ? profile : null}
        onClose={() => setIsEditing(false)}
        onSaved={(updated) => {
          setProfile(updated);
          setIsEditing(false);
        }}
      />

      <AvatarUploadModal
        profile={isUploadingAvatar ? profile : null}
        onClose={() => setIsUploadingAvatar(false)}
        onUploaded={(updated) => setProfile(updated)}
      />
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
