import type { Profile } from "./types";
import { parseApiError } from "@/lib/apiError";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Fetch a public profile by username — no auth required. Runs client-side on
 * the /[username] page (same page for owner and visitors). Returns null for
 * an unknown username so the caller can render a not-found state.
 */
export async function getProfile(username: string): Promise<Profile | null> {
  const res = await fetch(`${API_URL}/api/users/${username}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch profile: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Update the authenticated user's displayName and/or bio. Client-side —
 * called from the profile edit modal with the token read from localStorage.
 */
export async function updateProfile(
  token: string,
  updates: { displayName?: string; bio?: string }
): Promise<Profile> {
  const res = await fetch(`${API_URL}/api/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, `Failed to update profile: ${res.status} ${res.statusText}`));
  }

  return res.json();
}

interface AvatarUploadTarget {
  uploadUrl: string;
  key: string;
}

/**
 * Ask Express for a presigned S3 URL to upload a new avatar. Client-side —
 * called from the avatar upload modal. Doesn't touch avatar_url yet; that
 * only happens once confirmAvatarUpload() runs after the direct S3 upload.
 */
export async function requestAvatarUpload(
  token: string,
  file: File
): Promise<AvatarUploadTarget> {
  const res = await fetch(`${API_URL}/api/users/me/avatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ contentType: file.type, fileSize: file.size }),
  });

  if (!res.ok) {
    throw new Error(`Failed to request avatar upload: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Uploads the file directly to S3 via the presigned URL — never touches Express. */
export async function uploadAvatarFile(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload file to S3: ${res.status} ${res.statusText}`);
  }
}

/**
 * Confirms a completed S3 upload — Express fetches it back, resizes it, and
 * finalizes avatar_url. Call this only after uploadAvatarFile() succeeds.
 */
export async function confirmAvatarUpload(token: string, key: string): Promise<Profile> {
  const res = await fetch(`${API_URL}/api/users/me/avatar`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ key }),
  });

  if (!res.ok) {
    throw new Error(`Failed to confirm avatar upload: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
