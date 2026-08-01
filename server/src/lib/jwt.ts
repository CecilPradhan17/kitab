import jwt from "jsonwebtoken";

// No hardcoded fallback: a missing JWT_SECRET must fail startup loudly,
// not silently sign/verify tokens with a value that's public in the repo.
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required — set it in server/.env");
  }
  return secret;
}

const SECRET = requireJwtSecret();
const EXPIRY = "7d";

export interface JwtPayload {
  userId: string;
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

// Throws if the token is invalid or expired — callers (requireAuth middleware)
// catch this and return 401.
export function verifyToken(token: string): JwtPayload {
  // Tokens are only ever signed HS256 (signToken above never specifies an
  // algorithm, which defaults to HS256) — pinning it here removes any
  // dependence on the jsonwebtoken library's default set of acceptable
  // algorithms for verification.
  return jwt.verify(token, SECRET, { algorithms: ["HS256"] }) as JwtPayload;
}
