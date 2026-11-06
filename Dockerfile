# Nikhillesh Bhatkar Learning Academy — Fly.io container
# Zero-dependency Node.js server (no npm install needed at build time)

FROM node:24-alpine

WORKDIR /app

# Copy only what the server needs first (dependency-free, so this layer is cached).
# NOTE: scripts/ must stay a directory — server.js requires './scripts/seed.js'.
COPY server.js package.json ./
COPY scripts/ ./scripts/
COPY data/ ./data/
# seed.js reads auth.js from disk to extract the DEFAULT_* data, so it must be
# in the image too — without it the container's re-seed fails silently.
COPY auth.js ./

# Static site files
COPY admin.js student.js script.js chatbot.js i18n.js style.css ./
COPY *.html ./
COPY images/ ./images/
COPY *.png *.jpg *.jpeg ./

# Cache-bust: bumping this comment forces Fly to rebuild the image when the
# server.js fix needs to go live (deploy otherwise reuses the cached image).
# Last rebuild: 2026-11-06

# Fly.io mounts the persistent volume at /data, so point the server there
ENV DATA_DIR=/data

EXPOSE 8080

CMD ["node", "server.js"]