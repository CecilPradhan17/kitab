import { Router } from "express";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { pool } from "../db";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

const MAX_DISPLAY_NAME_LENGTH = 50; // mirrors the display_name_length CHECK constraint (server/db/10_display_name_length_constraint.sql)

// bcrypt's cost factor is embedded in each generated hash, so raising this
// only affects new registrations going forward — existing cost-10 hashes in
// the DB keep verifying fine, no migration needed.
const BCRYPT_ROUNDS = 12;

// A hash of a random, never-reused value, computed once at startup (not a
// hardcoded string literal) so its cost factor always matches BCRYPT_ROUNDS —
// a literal would silently drift to a different (and thus timing-
// distinguishable) cost factor whenever BCRYPT_ROUNDS changes. The input
// being random is irrelevant: nothing ever successfully compares against
// this hash, it exists purely to give the "user not found" path the same
// bcrypt.compare cost as the "user found" path — see login below.
const DUMMY_HASH = bcrypt.hashSync(randomUUID(), BCRYPT_ROUNDS);

// Keyed by IP (the default keyGenerator), not user id — unlike
// avatarUploadLimiter in users.ts, these routes are unauthenticated, so
// there's no user identity yet to key on. Guards against brute-forcing
// passwords (login) and mass account creation (register).
//
// Note: req.ip only reflects the real client IP once this app is deployed
// behind a proxy (Railway/Render) if app.set("trust proxy", 1) is configured
// in app.ts — otherwise every request appears to come from the proxy's IP
// and this limiter effectively becomes global instead of per-client.
// An object `message` is sent as JSON by express-rate-limit, matching the
// { error } shape parseApiError / the login page expect — the library
// default is plain text, which neither can parse.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

// POST /api/auth/register
// Body: { username, email, password, displayName? }
authRouter.post("/register", authLimiter, async (req, res) => {
  const { username, email, password, displayName } = req.body as {
    username?: string;
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email, and password are required" });
    return;
  }

  // "me" is reserved — it's a path segment used by PATCH /api/users/me.
  if (username === "me") {
    res.status(400).json({ error: "'me' is a reserved username" });
    return;
  }

  // Lowercase alphanumeric + underscores, 3-20 chars.
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    res.status(400).json({
      error: "username must be 3-20 characters: lowercase letters, numbers, underscores only",
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters" });
    return;
  }

  if (typeof displayName === "string" && displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    res.status(400).json({ error: `displayName must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer` });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query<{ id: string; username: string; display_name: string | null }>(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, display_name`,
      [username, email, passwordHash, displayName ?? null]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.id, username: user.username });

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name },
    });
  } catch (err: unknown) {
    // Postgres unique-violation code. Catches duplicate username or email.
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "username or email already taken" });
      return;
    }
    console.error("register error:", err);
    res.status(500).json({ error: "internal server error" });
  }
});

// POST /api/auth/login
// Body: { email, password }
authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const result = await pool.query<{
      id: string;
      username: string;
      display_name: string | null;
      password_hash: string;
    }>(
      `SELECT id, username, display_name, password_hash FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    // Always run bcrypt.compare, even when no user was found — comparing
    // against DUMMY_HASH in that case instead of short-circuiting. Without
    // this, bcrypt.compare is skipped entirely for unknown emails, and its
    // cost (tens of milliseconds) is easily distinguishable from the
    // near-instant "no such user" response, letting a timing attack enumerate
    // valid emails. The dummy compare flattens that difference.
    const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    // Deliberately vague — don't reveal whether the email exists.
    if (!user || !passwordMatches) {
      res.status(401).json({ error: "invalid email or password" });
      return;
    }

    const token = signToken({ userId: user.id, username: user.username });

    res.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "internal server error" });
  }
});

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}
