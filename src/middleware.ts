import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("kitab-token");

  // Only the home page (own library) requires auth — redirect to login if
  // no cookie. Public profile pages (/[username]) are open to all visitors.
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
