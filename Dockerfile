# Nikhillesh Bhatkar Learning Academy — Fly.io container
# Zero-dependency Node.js server (no npm install needed at build time)

FROM node:24-alpine

WORKDIR /app

# Copy only what the server needs first (dependency-free, so this layer is cached)
COPY server.js scripts/seed.js package.json ./
COPY data/ ./data/

# Copy static site files
COPY auth.js admin.js student.js script.js chatbot.js i18n.js style.css ./
COPY *.html ./
COPY images/ ./images/
COPY *.png *.jpg *.jpeg ./

# Fly.io mounts the persistent volume at /data, so point the server there
ENV DATA_DIR=/data

EXPOSE 8080

CMD ["node", "server.js"]