import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

const ALLOWED_MODES = new Set(["normal", "learning", "concise"]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query =
    body && typeof body === "object" && "query" in body
      ? String((body as { query: unknown }).query ?? "")
      : "";
  const mode =
    body && typeof body === "object" && "mode" in body
      ? String((body as { mode: unknown }).mode ?? "normal")
      : "normal";

  if (!query.trim()) {
    return NextResponse.json({ error: "query is required." }, { status: 400 });
  }
  if (!ALLOWED_MODES.has(mode)) {
    return NextResponse.json(
      { error: `mode must be one of ${[...ALLOWED_MODES].join(", ")}.` },
      { status: 400 }
    );
  }

  const upstream = await fetch(`${BACKEND_URL}/ask`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ query, mode }),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
