"use client";

import { useEffect, useState } from "react";
import type { Profile } from "./types";
import { updateProfile } from "./profileApi";
import { getStoredToken } from "@/lib/auth";

interface EditProfileModalProps {
  /** The profile to edit, or null when the modal is closed — same pattern as
      BookDetailModal: no separate boolean, no way to be "open" with nothing to edit. */
  profile: Profile | null;
  onClose: () => void;
  /** Called with the updated profile after a successful save, so the parent
      (ProfileHeader) can sync its copy. Keeps this modal from owning profile state. */
  onSaved: (profile: Profile) => void;
}

export default function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the draft from the current profile whenever the modal opens.
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setBio(profile.bio ?? "");
    setError(null);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [profile, onClose]);

  if (!profile) return null;

  async function handleSave() {
    const token = getStoredToken();
    if (!token) {
      setError("You need to be signed in to do that.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(token, {
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      onSaved(updated);
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 shadow-2xl shadow-black/80"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden className="text-xl leading-none">
            &times;
          </span>
        </button>

        <h2 className="font-serif text-2xl text-foreground">Edit profile</h2>

        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="displayName"
              className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted"
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              className="w-full rounded border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="bio"
              className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted"
            >
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell people what you're reading"
              className="w-full resize-none rounded border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent"
            />
          </div>

          {error && <p className="font-sans text-sm text-red-400/80">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex rounded-full border border-accent/50 px-5 py-2 font-sans text-xs uppercase tracking-[0.2em] text-accent outline-none transition-colors hover:bg-accent hover:text-background focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex rounded-full px-5 py-2 font-sans text-xs uppercase tracking-[0.2em] text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
