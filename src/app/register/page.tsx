"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setStoredToken, setStoredUser } from "@/lib/auth";
import { API_URL } from "@/lib/apiUrl";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          displayName: displayName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setStoredToken(data.token);
      setStoredUser(data.user);
      router.replace(`/${data.user.username}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-center font-sans text-[0.65rem] uppercase tracking-[0.3em] text-accent mb-10">
          Kitab
        </p>

        <h1 className="font-serif text-3xl text-foreground text-center mb-10">
          Start your library.
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted/90 focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-[0.6rem] text-muted">
              3–20 chars. Lowercase letters, numbers, underscores. Your profile will be at /username.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="displayName" className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
              Display name <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted/90 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted/90 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted/90 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400/90">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-accent text-background font-sans text-xs uppercase tracking-[0.2em] py-3.5 rounded font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-center font-sans text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:text-accent transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
