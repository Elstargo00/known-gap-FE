import { cookies } from "next/headers";
import { TOKEN_COOKIE, verifyToken, type KnownGapJwtPayload } from "./jwt";

export interface Session {
  token: string;
  payload: KnownGapJwtPayload;
}

/** Read the JWT from the httpOnly cookie and verify it. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return { token, payload };
}
