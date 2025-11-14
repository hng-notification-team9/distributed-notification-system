# Dockerfile
FROM node:20-slim AS base

# Install TypeScript for build
RUN npm install -g typescript

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /app

# Copy built app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY package*.json ./
COPY .env.example ./.env

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:4001/health || exit 1

CMD ["node", "dist/server.js"]
