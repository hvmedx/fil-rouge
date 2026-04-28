#!/usr/bin/env bash
# Build and run all three application containers (api, web, landing) on the "devops" network.
# Mimics what the Jenkins pipelines do, useful for first-time setup or local sanity check.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NETWORK="${NETWORK:-devops}"
TAG="${TAG:-local}"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
JWT_SECRET="${JWT_SECRET:-dev-secret-change-me-$(openssl rand -hex 8)}"

docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK"

# Make sure the mongo container from devops/docker-compose.yml is running
if ! docker ps --format '{{.Names}}' | grep -q '^mongo$'; then
    echo "Starting standalone mongo (devops stack not running)..."
    docker run -d --name mongo --network "$NETWORK" -v mongo_data:/data/db --restart unless-stopped mongo:7
fi

echo "[1/3] Building images..."
docker build --build-arg BUILD_SHA="$SHA" -t "mycontacts-api:$TAG" server/
docker build --build-arg BUILD_SHA="$SHA" --build-arg VITE_API_URL="http://localhost:4000" -t "mycontacts-web:$TAG" client/
docker build --build-arg BUILD_SHA="$SHA" -t "mycontacts-landing:$TAG" landing/

echo "[2/3] Recreating app containers..."
for c in mycontacts-api mycontacts-web mycontacts-landing; do
    docker rm -f "$c" 2>/dev/null || true
done

docker run -d --name mycontacts-api --network "$NETWORK" \
    -e NODE_ENV=production -e PORT=4000 \
    -e MONGODB_URI=mongodb://mongo:27017/mycontacts \
    -e JWT_SECRET="$JWT_SECRET" \
    -p 4000:4000 \
    --restart unless-stopped \
    "mycontacts-api:$TAG"

docker run -d --name mycontacts-web --network "$NETWORK" \
    -p 3001:80 \
    --restart unless-stopped \
    "mycontacts-web:$TAG"

docker run -d --name mycontacts-landing --network "$NETWORK" \
    -p 3002:80 \
    --restart unless-stopped \
    "mycontacts-landing:$TAG"

echo "[3/3] Waiting for /health on the API..."
for i in $(seq 1 20); do
    if curl -fsS http://localhost:4000/health | grep -q '"ok"'; then
        echo "  API healthy."
        break
    fi
    sleep 2
    [ "$i" = 20 ] && { echo "  /health did not come up — check 'docker logs mycontacts-api'"; exit 1; }
done

cat <<EOF

  ╭─────────────────────────────────────────────────╮
  │  Apps are UP                                    │
  ├─────────────────────────────────────────────────┤
  │  Landing      → http://localhost:3002           │
  │  Web (SPA)    → http://localhost:3001           │
  │  API          → http://localhost:4000           │
  │  API health   → http://localhost:4000/health    │
  │  API docs     → http://localhost:4000/docs      │
  ╰─────────────────────────────────────────────────╯
EOF
