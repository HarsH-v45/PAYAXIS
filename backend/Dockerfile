FROM node:20-slim AS production
RUN apt-get update && apt-get install -y chromium fonts-noto fonts-liberation --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -r payaxis && useradd -r -g payaxis payaxis \
  && mkdir -p /app/storage && chown -R payaxis:payaxis /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN chown -R payaxis:payaxis /app
USER payaxis
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health',r=>r.statusCode===200?process.exit(0):process.exit(1))"
CMD ["node","server.js"]
