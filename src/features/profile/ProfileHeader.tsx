"use client";

import { useEffect, useRef, useState } from "react";
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
    it; owns a local copy of it so an edit can update the view in place.
    Laid out as a single centered column — one axis, one visual anchor —
    rather than elements pinned to opposite corners. */
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

  // Brief "Copied ✓" confirmation on the copy button. The timeout is cleared
  // on unmount (and on re-copy) so it can't set state on a dead component.
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      // Built from window.location.origin (not a hardcoded domain or the
      // build-time NEXT_PUBLIC_SITE_URL) so it's always correct for
      // whichever domain actually served this page - prod, a Vercel preview,
      // or localhost - with no drift if a custom domain gets added later.
      // /[username] is the real route (see CLAUDE.md's "Library page"
      // section) - there is no /u/ prefix.
      const profileUrl = `${window.location.origin}/${username}`;
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure context / denied permission).
      // Without a raw URL on screen anymore, fail quietly — the button just
      // doesn't confirm, and the share link is still reachable via the OS
      // address bar.
    }
  };

  return (
    <header
      className="relative w-full px-6 pb-12 pt-14 sm:pb-16 sm:pt-20"
      style={{
        // Faint warm glow centered behind the avatar — a single light source
        // for a single-column layout — fading into the page's near-black.
        background:
          "radial-gradient(ellipse 50% 40% at 50% 0%, #191309 0%, #0a0908 75%)",
        borderBottom: "0.5px solid rgba(201, 151, 58, 0.15)",
      }}
    >
      <div className="mx-auto flex max-w-[38rem] flex-col items-center text-center">
        {/* Avatar: circular image, or a dark circle with the user's initial.
            Hairline gold ring marks it as the page's anchor. Owner-only
            change trigger overlays the whole thing on hover/focus. */}
        <div className="relative">
          {showFallback ? (
            <div
              aria-label={`${shownName} avatar`}
              className="flex h-24 w-24 items-center justify-center rounded-full font-serif text-4xl sm:h-28 sm:w-28"
              style={{
                background: "#15110d",
                color: "var(--accent)",
                boxShadow:
                  "0 0 0 1px rgba(201, 151, 58, 0.25), 0 12px 32px rgba(0, 0, 0, 0.5)",
              }}
            >
              {initial}
            </div>
          ) : (
            <img
              src={avatarUrl ?? undefined}
              alt={`${shownName} avatar`}
              onError={() => setImgFailed(true)}
              className="h-24 w-24 rounded-full object-cover sm:h-28 sm:w-28"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(201, 151, 58, 0.25), 0 12px 32px rgba(0, 0, 0, 0.5)",
              }}
            />
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => setIsUploadingAvatar(true)}
              aria-label="Change photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 outline-none transition-all hover:bg-black/50 hover:opacity-100 focus-visible:bg-black/50 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="font-sans text-[0.6rem] uppercase tracking-[0.15em] text-white">
                Change
              </span>
            </button>
          )}
        </div>

        {/* Identity: name and handle read as one unit, tightly paired. */}
        <h1 className="mt-6 font-serif text-3xl font-medium text-foreground sm:text-4xl">
          {shownName}
        </h1>
        <p
          className="mt-1.5 font-sans text-[0.8rem] tracking-wide"
          style={{ color: "#9a7a3a" }}
        >
          @{username}
        </p>

        {bio && (
          <p
            className="mt-4 max-w-md font-sans text-sm leading-relaxed"
            style={{ color: "#a89880" }}
          >
            {bio}
          </p>
        )}

        {/* Stat: one quiet centered moment. Serif number over a small-caps
            label; extends naturally to a row if more stats arrive later. */}
        <div className="mt-8 flex flex-col items-center gap-1">
          <span className="font-serif text-2xl text-foreground">
            {booksReadCount}
          </span>
          <span className="font-sans text-[0.625rem] uppercase tracking-[0.15em] text-muted">
            Books Read
          </span>
        </div>

        {/* Actions: matching quiet pills. Copy confirms in place ("Copied ✓")
            instead of printing a raw URL on the page. */}
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy profile link"
            className="rounded-full border border-white/10 px-5 py-2 font-sans text-[0.65rem] uppercase tracking-[0.15em] outline-none transition-colors hover:border-white/25 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
            style={{ color: copied ? "var(--accent)" : "#a89880" }}
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-accent/50 px-5 py-2 font-sans text-[0.65rem] uppercase tracking-[0.15em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent"
            >
              Edit profile
            </button>
          )}
        </div>
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
