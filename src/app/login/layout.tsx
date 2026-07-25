import type { Metadata } from "next";

// login/page.tsx is a client component ("use client"), and metadata can't
// be exported from one - this sibling server-component layout carries the
// route's metadata instead.
export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
