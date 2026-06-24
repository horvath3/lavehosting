FROM node:20-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./

ENV DATA_DIR=/var/lib/lave/servers
VOLUME ["/var/lib/lave"]

CMD ["node", "index.js"]
