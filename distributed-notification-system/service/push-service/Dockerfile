# ---- Dockerfile ----
FROM node:18-alpine

# Install ts-node globally (so we can run .ts files directly)
RUN npm install -g ts-node typescript

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci   # clean install

# Copy source
COPY . .

# Expose port
EXPOSE 4000

# Run with ts-node (dev mode) – no build step needed
CMD ["ts-node", "src/server.ts"]