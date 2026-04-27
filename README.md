# Known Gap — Frontend

Next.js UI for the [Known Gap backend](https://github.com/) — a knowledge-gap-aware Q&A service that tailors answers to what each user has already seen. This repo is the **optional frontend** deliverable for the assignment; the backend carries the core RAG + knowledge-graph logic.

Two pages, gated by a minimal login: `/login` (username + password) and `/` (ask + ingest in three modes: Normal / Learning / Concise).

## Features

- **Ask** in three modes:
  - **Normal** — vanilla RAG answer.
  - **Learning** — concepts you've crossed the `known_score` threshold on are masked as click-to-reveal fill-in-the-blanks, so you can self-test on what you've already seen before the answer hands you the word.
  - **Concise** — skips re-explaining anything in your graph.
- **Ingest** `.pdf`, `.md`, or `.txt` files (up to 20 MB) straight into the backend's pgvector corpus.
- **Username + password gate** with a configurable allow-list (`ALLOWED_USERS`) — no registration flow, no user DB.
- **httpOnly cookie-based auth**: the JWT never touches client JS; all backend calls are proxied through Next.js server routes that attach `Authorization: Bearer …` from a signed, `httpOnly`, `SameSite=Lax` cookie.
- **Deterministic user identity**: each username derives a UUIDv5 that becomes the JWT `sub` claim, so the same login always lands in the same knowledge graph.

## Prerequisites

- **Node.js 20+** and **npm**
- A running Known Gap backend (local Docker or remote). The frontend talks to it over HTTPS/HTTP.
- A shared `JWT_SECRET` ≥ 32 bytes — identical on the backend and here, HS256-compatible.

## Quickstart

```bash
# 1. Install deps
npm install

# 2. Configure
cp .env.local.example .env.local
# Edit .env.local:
#   - NEXT_PUBLIC_BACKEND_URL   → where the FastAPI backend is reachable
#   - JWT_SECRET                → must exactly match the backend's JWT_SECRET
#   - ALLOWED_USERS             → demo login allow-list

# 3. Run
npm run dev
# http://localhost:3000
```

Generate a fresh `JWT_SECRET` (use the same value on both sides):

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# or
openssl rand -base64 32
```

## Environment variables

See [`.env.local.example`](./.env.local.example) for the full list. Required:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | FastAPI backend origin, e.g. `http://localhost:8001` |
| `JWT_SECRET` | HS256 shared secret — byte-identical to the backend's |
| `ALLOWED_USERS` | `user1:pass1,user2:pass2,…` — only these pairs may log in |

`ALLOWED_USERS` format notes: usernames are matched case-insensitively; passwords may not contain `:` or `,` (demo limitation — swap to JSON if you need them).

## Scripts

```bash
npm run dev      # next dev on :3000
npm run build    # next build (type-checks + optimises)
npm run start    # next start (serves the production build)
```

## Project structure

```
app/
├── api/
│   ├── ask/route.ts        # proxies POST /ask, attaches Bearer from cookie
│   ├── ingest/route.ts     # proxies multipart /ingest, 20 MB cap
│   ├── login/route.ts      # validates creds, mints JWT, sets kg_token cookie
│   └── logout/route.ts     # clears the cookie
├── login/page.tsx          # server-redirects to / if already signed in
├── page.tsx                # server-redirects to /login if unauth
├── layout.tsx              # root layout (Geist fonts)
└── globals.css             # Tailwind + dark-mode body colors + autofill override
components/
├── LoginForm.tsx           # username + password form
├── Workspace.tsx           # mode pills, ask form, answer panel, ingest
└── ClozeText.tsx           # parses <cloze concept="…"> tags → click-to-reveal blanks
lib/
├── jwt.ts                  # jose HS256 sign/verify + UUIDv5 from username
├── session.ts              # reads cookie → verifyToken() for page guards
└── types.ts                # AskMode / AskResponse / Source / Concept
scripts/
└── test-jwt.mjs            # disposable: mint → verify → tamper-reject sanity check
```

## How the auth boundary works

1. User submits `{username, password}` → `POST /api/login`.
2. Server route validates against `ALLOWED_USERS`, derives `sub = uuidv5(username, URL_namespace)`, signs a JWT `{sub, iat, exp}` with `JWT_SECRET`, and sets it as an `httpOnly` cookie named `kg_token` (24h TTL).
3. On every backend call, the browser hits a Next.js server route (`/api/ask`, `/api/ingest`). That route reads `kg_token` server-side and forwards the request to the FastAPI backend with `Authorization: Bearer <token>`.
4. The JWT never reaches client JS. No CORS configuration is needed on the backend because the browser only talks to the same origin.

## License

TBD.
