FROM node:20-slim

# Install ffmpeg system package so fluent-ffmpeg can find it at runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests from the server/ subdirectory and install dependencies.
# Build context is the repo root; .dockerignore ensures only server/ source is sent.
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the server source (node_modules is excluded via .dockerignore)
COPY server/ ./

EXPOSE 8080

ENV PORT=8080

CMD ["node", "index.js"]