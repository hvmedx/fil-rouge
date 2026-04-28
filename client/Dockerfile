# syntax=docker/dockerfile:1.7

# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

ARG VITE_API_URL=http://localhost:4000
ARG BUILD_SHA=dev
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_BUILD_SHA=${BUILD_SHA}

COPY . .
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime
LABEL org.opencontainers.image.title="mycontacts-web" \
      org.opencontainers.image.source="https://github.com/hbenarous/fil-rouge" \
      org.opencontainers.image.description="MyContacts React frontend (static via nginx)"

RUN rm -rf /usr/share/nginx/html/* \
    && rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
