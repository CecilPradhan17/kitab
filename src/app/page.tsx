"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";
import LandingPage from "@/features/landing/LandingPage";

// "/" serves two audiences based on local auth state: logged-in users are
// redirected straight to their own /[username] library, and logged-out
// visitors see the marketing landing page instead of being bounced to
// /login.
export default function Home() {
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      router.replace(`/${user.username}`);
    } else {
      setShowLanding(true);
    }
  }, [router]);

  // Render nothing until the auth check resolves, so a logged-in user never
  // sees a flash of the landing page mid-redirect.
  if (!showLanding) return null;

  return <LandingPage />;
}
