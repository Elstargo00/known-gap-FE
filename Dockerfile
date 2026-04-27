# syntax=docker/dockerfile:1.7

# ── 1. install deps ──────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


# ── 2. build (Next.js standalone output) ─────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are referenced during `next build`. Pass it as a
# build arg so the production bundle has the correct backend URL baked in.
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


# ── 3. minimal runtime ───────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output places only what the server needs at .next/standalone/.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
