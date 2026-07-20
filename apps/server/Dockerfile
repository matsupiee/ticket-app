FROM oven/bun:1.3.11 AS deps

WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/web-admin-organizer/package.json apps/web-admin-organizer/package.json
COPY apps/web-admin-platform/package.json apps/web-admin-platform/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/infra/package.json packages/infra/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN bun install --frozen-lockfile

FROM deps AS builder

COPY . .

RUN bun --cwd packages/db prisma generate
RUN bunx turbo run build -F server

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/server/node_modules apps/server/node_modules
COPY --from=builder /app/apps/server/dist apps/server/dist
COPY --from=builder /app/apps/server/package.json apps/server/package.json
COPY --from=builder /app/package.json package.json

EXPOSE 8080

CMD ["node", "apps/server/dist/index.mjs"]
