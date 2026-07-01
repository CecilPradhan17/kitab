import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db";
import { signToken } from "../lib/jwt";

export const authRouter = Router();

// POST /api/auth/register
// Body: { username, email, password, displayName? }
authRouter.post("/register", async (req, res) => {
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

  try {
    const passwordHash = await bcrypt.hash(password, 10);

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
authRouter.post("/login", async (req, res) => {
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

    // Deliberately vague — don't reveal whether the email exists.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
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
