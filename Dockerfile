FROM node:20-slim

# Install ffmpeg system package so fluent-ffmpeg can find it at runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server source and install dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./

EXPOSE 8080

ENV PORT=8080

CMD ["node", "index.js"]
