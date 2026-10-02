# Meridian Learning Center — one image: the API, which also serves the built web app.

# ── Build: compile the server and bundle the web app ─────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY server server
COPY web web
RUN npm run build

# ── Runtime: production dependencies of the server only ──────────────────────────────
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev -w server && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web/dist
# Lesson bodies read by the seed script (node dist/seed/index.js).
COPY server/src/seed/content server/src/seed/content
# Created here so the named volume mounted on it inherits the `node` owner.
RUN mkdir -p server/uploads && chown -R node:node server/uploads

USER node
WORKDIR /app/server
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
