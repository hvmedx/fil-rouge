# syntax=docker/dockerfile:1.7

# ---- deps stage (full install for build/test) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- prod-deps stage (only runtime deps) ----
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime stage ----
FROM node:20-alpine AS runtime
LABEL org.opencontainers.image.title="mycontacts-api" \
      org.opencontainers.image.source="https://github.com/hbenarous/fil-rouge" \
      org.opencontainers.image.description="MyContacts Express API"

ARG BUILD_SHA=dev
ENV NODE_ENV=production \
    PORT=4000 \
    BUILD_SHA=${BUILD_SHA}

RUN apk add --no-cache wget tini \
    && addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --chown=app:app --from=prod-deps /app/node_modules ./node_modules
COPY --chown=app:app package.json ./
COPY --chown=app:app src ./src

USER app
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health | grep -q '"ok"' || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
