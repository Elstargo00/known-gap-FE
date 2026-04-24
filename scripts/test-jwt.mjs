// Disposable self-check: mints a JWT the same way lib/jwt.ts does (jose +
// uuid v5 from URL namespace), then verifies it round-trips and that
// tampering fails. Exits non-zero on any mismatch.
//
// Usage:  node scripts/test-jwt.mjs
// Optional: JWT_SECRET=... node scripts/test-jwt.mjs

import { SignJWT, jwtVerify } from "jose";
import { v5 as uuidv5 } from "uuid";

const SECRET =
  process.env.JWT_SECRET ??
  "change-me-to-match-backend-jwt-secret-minimum-32-bytes";
const keyBytes = new TextEncoder().encode(SECRET);

const email = "alice@example.com";
const subA = uuidv5(email.trim().toLowerCase(), uuidv5.URL);
const subB = uuidv5("ALICE@example.com  ".trim().toLowerCase(), uuidv5.URL);
if (subA !== subB) {
  console.error(`UUIDv5 should be case/whitespace-stable: ${subA} vs ${subB}`);
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24;

const token = await new SignJWT({ email })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setSubject(subA)
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .sign(keyBytes);

const { payload } = await jwtVerify(token, keyBytes, { algorithms: ["HS256"] });

for (const [k, v] of Object.entries({ sub: subA, iat: now, exp, email })) {
  if (payload[k] !== v) {
    console.error(`claim mismatch: ${k} expected=${v} got=${payload[k]}`);
    process.exit(1);
  }
}

const tampered = token.slice(0, -2) + (token.endsWith("A") ? "B" : "A");
try {
  await jwtVerify(tampered, keyBytes, { algorithms: ["HS256"] });
  console.error("tampered token should not verify");
  process.exit(1);
} catch {
  // expected
}

console.log(
  JSON.stringify(
    { ok: true, sub: subA, iat: payload.iat, exp: payload.exp, email },
    null,
    2
  )
);
