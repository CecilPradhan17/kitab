/**
 * Parses the { error, details? } JSON body Express sends on a failed
 * response (e.g. POST /api/books, PATCH /api/users/me) into a single
 * user-facing message. Falls back to `fallback` if the body isn't JSON or
 * doesn't match that shape, so a network-level failure still shows something.
 */
export async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (Array.isArray(body?.details) && body.details.length > 0) {
      return body.details.join(" ");
    }
    if (typeof body?.error === "string") {
      return body.error;
    }
  } catch {
    // Response wasn't JSON — fall through to the fallback below.
  }
  return fallback;
}
