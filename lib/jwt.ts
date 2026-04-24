import { SignJWT, jwtVerify } from "jose";
import { v5 as uuidv5 } from "uuid";

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Copy .env.local.example to .env.local and fill it in."
    );
  }
  return new TextEncoder().encode(secret);
}

/** UUID v5 from an identifier (username or email), using the URL namespace.
 * Stable: the same identifier always maps to the same user / graph. */
export function userIdFromIdentifier(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  return uuidv5(normalized, uuidv5.URL);
}

export interface KnownGapJwtPayload {
  sub: string;
  iat: number;
  exp: number;
  email?: string;
}

export async function signToken(params: {
  sub: string;
  email?: string;
}): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;
  const token = await new SignJWT({ email: params.email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(params.sub)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getSecret());
  return { token, expiresAt: exp };
}

export async function verifyToken(
  token: string
): Promise<KnownGapJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      iat: payload.iat,
      exp: payload.exp,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}

export const TOKEN_COOKIE = "kg_token";
export const TOKEN_COOKIE_MAX_AGE = TOKEN_TTL_SECONDS;
