import { NextRequest, NextResponse } from "next/server";

const EXPRESS_URL = process.env.API_URL ?? "http://localhost:4000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const expressRes = await fetch(`${EXPRESS_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await expressRes.json();

  if (!expressRes.ok) {
    return NextResponse.json(data, { status: expressRes.status });
  }

  const response = NextResponse.json({ user: data.user });
  response.cookies.set("kitab-token", data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
