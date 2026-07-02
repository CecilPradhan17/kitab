import { cookies } from "next/headers";

// Returns the raw JWT from the httpOnly cookie, or null if not present.
// Use this in RSC/server utilities that need to forward the token to Express.
export async function getToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("kitab-token")?.value ?? null;
}
