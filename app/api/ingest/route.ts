import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

// Accept up to 20 MB to match backend limit; Next body size config below.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A 'file' field is required." },
      { status: 400 }
    );
  }

  // Forward as-is to the backend so it can see the original filename.
  const forward = new FormData();
  forward.append("file", file, file.name);

  const upstream = await fetch(`${BACKEND_URL}/ingest`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.token}`,
    },
    body: forward,
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
