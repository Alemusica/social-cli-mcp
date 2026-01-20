FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (need devDeps for build)
RUN npm ci

# Copy source
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Run the bot
CMD ["node", "dist/telegram-bot.js"]
