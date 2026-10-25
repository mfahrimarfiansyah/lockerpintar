# syntax=docker/dockerfile:1
ARG NODE_VERSION=24-alpine

# Dependensi (prisma generate butuh DATABASE_URL, cukup nilai dummy saat build)
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=1
RUN npx prisma generate && npx next build

# Untuk migrasi & perintah satu kali (mis. membuat admin pertama)
FROM builder AS migrator
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
