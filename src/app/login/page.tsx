"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setStoredToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setStoredToken(data.token);
      router.replace("/");
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
          Welcome back.
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400/90">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-accent text-background font-sans text-xs uppercase tracking-[0.2em] py-3.5 rounded font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center font-sans text-sm text-muted">
          No account?{" "}
          <Link href="/register" className="text-foreground hover:text-accent transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
