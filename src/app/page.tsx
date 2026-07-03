"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";

// "/" is not a real page — it's a redirect based on local auth state.
// Logged-in users land on their own /[username] library; everyone else
// goes to /login. No UI of its own.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    router.replace(user ? `/${user.username}` : "/login");
  }, [router]);

  return null;
}
