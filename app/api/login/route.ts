import { NextResponse } from "next/server";

import {
  TOKEN_COOKIE,
  TOKEN_COOKIE_MAX_AGE,
  signToken,
  userIdFromIdentifier,
} from "@/lib/jwt";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { username, password } = extractCredentials(body);
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  const allowed = parseAllowedUsers(process.env.ALLOWED_USERS);
  if (allowed.size === 0) {
    return NextResponse.json(
      { error: "ALLOWED_USERS is not configured." },
      { status: 500 },
    );
  }

  const normalizedUsername = username.toLowerCase();
  const expectedPassword = allowed.get(normalizedUsername);
  if (!expectedPassword || expectedPassword !== password) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );
  }

  const sub = userIdFromIdentifier(normalizedUsername);
  const { token } = await signToken({ sub, email: normalizedUsername });

  const res = NextResponse.json({ ok: true, sub, username: normalizedUsername });
  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_COOKIE_MAX_AGE,
  });
  return res;
}

function extractCredentials(body: unknown): {
  username: string;
  password: string;
} {
  if (!body || typeof body !== "object") {
    return { username: "", password: "" };
  }
  const record = body as Record<string, unknown>;
  return {
    username:
      typeof record.username === "string" ? record.username.trim() : "",
    password: typeof record.password === "string" ? record.password : "",
  };
}

/**
 * Parse ALLOWED_USERS="user1:pass1,user2:pass2" into a Map keyed by
 * lowercased username. Silently drops malformed entries. Passwords
 * containing ':' or ',' are not supported by this simple format.
 */
function parseAllowedUsers(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(":");
    if (sep <= 0) continue;
    const username = trimmed.slice(0, sep).trim().toLowerCase();
    const password = trimmed.slice(sep + 1).trim();
    if (username && password) map.set(username, password);
  }
  return map;
}
