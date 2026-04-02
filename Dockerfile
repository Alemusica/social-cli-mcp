FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json drizzle.config.ts ./
COPY src/ src/
RUN npm run build
RUN npm ci --omit=dev

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

ENV NODE_ENV=production
RUN addgroup --system mcp && adduser --system --ingroup mcp mcp
USER mcp

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["node", "dist/server/index.js"]
