import type { Profile } from "./types";

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
    throw new Error(`Failed to update profile: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
