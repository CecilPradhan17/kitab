"use client";

import { useEffect, useRef, useState } from "react";
import FocusTrap from "focus-trap-react";
import FocusGuard from "@/features/a11y/FocusGuard";
import { useGuardedTabTrap } from "@/features/a11y/useGuardedTabTrap";
import type { Profile } from "./types";
import { requestAvatarUpload, uploadAvatarFile, confirmAvatarUpload } from "./profileApi";
import { getStoredToken } from "@/lib/auth";

// Mirrors the server-side limits (server/src/routes/users.ts) — this is just
// for fast feedback before a network round-trip; the server is the real check.
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

interface AvatarUploadModalProps {
  /** The profile whose avatar is being changed, or null when closed — same
      open/closed pattern as the other modals. */
  profile: Profile | null;
  onClose: () => void;
  /** Called with the updated profile once the upload is confirmed, so the
      parent (ProfileHeader) can sync its copy. */
  onUploaded: (profile: Profile) => void;
}

/** Dedicated avatar-change modal — separate from EditProfileModal (which only
    handles displayName/bio). Selecting a file uploads it immediately; unlike
    the other modal's fields, there's no draft/Save step, since by the time
    the S3 confirm call succeeds the avatar is already live server-side. */
export default function AvatarUploadModal({
  profile,
  onClose,
  onUploaded,
}: AvatarUploadModalProps) {
  const { firstGuardRef, panelRef, lastGuardRef, containerElements } =
    useGuardedTabTrap<HTMLDivElement>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset local state each time the modal opens (not on every parent
  // re-render — see the `profile !== null` dependency, which only fires on
  // the closed->open transition).
  useEffect(() => {
    if (profile) {
      setPreviewUrl(null);
      setUploading(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile !== null]);

  useEffect(() => {
    if (!profile) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !uploading) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [profile, onClose, uploading]);

  // Avoid leaking the local blob URL once it's replaced or the modal unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!profile) return null;

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    const token = getStoredToken();
    if (!token) {
      setError("You need to be signed in to do that.");
      setUploading(false);
      return;
    }

    try {
      const { uploadUrl, key } = await requestAvatarUpload(token, file);
      await uploadAvatarFile(uploadUrl, file);
      const updated = await confirmAvatarUpload(token, key);
      onUploaded(updated);
      onClose();
    } catch {
      setError("Couldn't upload photo. Please try again.");
      setUploading(false);
    }
  }

  const shownName = profile.displayName?.trim() || profile.username;
  const initial = shownName.charAt(0).toUpperCase() || "·";
  const displayedAvatarUrl = previewUrl ?? profile.avatarUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Change photo"
      onClick={() => !uploading && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      {/* escapeDeactivates: false - Escape is already handled above. */}
      <FocusGuard ref={firstGuardRef} position="first" />
      <FocusTrap containerElements={containerElements} focusTrapOptions={{ escapeDeactivates: false }}>
      <div
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 shadow-2xl shadow-black/80"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
        >
          <span aria-hidden className="text-xl leading-none">
            &times;
          </span>
        </button>

        <h2 className="font-serif text-2xl text-foreground">Change photo</h2>

        <div className="relative mt-6 h-32 w-32 shrink-0">
          {displayedAvatarUrl ? (
            <img
              src={displayedAvatarUrl}
              alt={`${shownName} avatar`}
              className="h-32 w-32 rounded-2xl object-cover"
              style={{ boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)" }}
            />
          ) : (
            <div
              className="flex h-32 w-32 items-center justify-center rounded-2xl font-serif text-5xl"
              style={{
                background: "#15110d",
                color: "var(--accent)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
              }}
            >
              {initial}
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
              <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-accent">
                Uploading…
              </span>
            </div>
          )}
        </div>

        {error && <p className="mt-4 font-sans text-sm text-red-400/80">{error}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_AVATAR_TYPES.join(",")}
          onChange={handleFileSelected}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-6 inline-flex rounded-full border border-accent/50 px-5 py-2 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
        >
          {uploading ? "Uploading…" : "Choose photo"}
        </button>
      </div>
      </FocusTrap>
      <FocusGuard ref={lastGuardRef} position="last" />
    </div>
  );
}
