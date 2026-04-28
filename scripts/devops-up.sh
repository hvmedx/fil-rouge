#!/usr/bin/env bash
# Bring up the full DevOps stack (Jenkins + SonarQube + Mongo) on the "devops" Docker network.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon not reachable. Start Docker first." >&2
    exit 1
fi

echo "[1/4] Ensuring 'devops' Docker network exists..."
docker network inspect devops >/dev/null 2>&1 || docker network create devops

# Pass the host's docker.sock gid to the build so the jenkins user can access it
DOCKER_GID="$(stat -c '%g' /var/run/docker.sock)"
export DOCKER_GID
echo "    (host docker.sock gid = $DOCKER_GID)"

echo "[2/4] Building Jenkins image (with Docker CLI baked in)..."
docker compose -f devops/docker-compose.yml build

echo "[3/4] Starting Jenkins, SonarQube, sonar-db, Mongo..."
docker compose -f devops/docker-compose.yml up -d

echo "[4/4] Waiting for services to come up..."
for svc in jenkins:8090 sonarqube:9000; do
    name="${svc%%:*}"; port="${svc##*:}"
    printf "  - %-12s " "$name"
    for i in $(seq 1 60); do
        if curl -fsS "http://localhost:${port}" -o /dev/null 2>&1 \
           || curl -fsS "http://localhost:${port}/login" -o /dev/null 2>&1; then
            echo "ready (http://localhost:${port})"
            break
        fi
        sleep 2
        [ "$i" = 60 ] && { echo "TIMEOUT — check 'docker logs $name'"; exit 1; }
    done
done

cat <<EOF

  ╭─────────────────────────────────────────────────╮
  │  DevOps stack is UP                             │
  ├─────────────────────────────────────────────────┤
  │  Jenkins      → http://localhost:8090           │
  │     login     → admin / admin (CHANGE IT)       │
  │  SonarQube    → http://localhost:9000           │
  │     login     → admin / admin                   │
  │  Mongo        → mongodb://mongo:27017 (network) │
  ╰─────────────────────────────────────────────────╯

Next steps:
  1. Open Jenkins, change the admin password.
  2. Open SonarQube, change the admin password, generate a token,
     then add it to Jenkins as a 'Secret text' credential id 'sonar-token'.
  3. Run scripts/apps-up.sh once to seed the application containers
     (or trigger the Jenkins jobs to do it).
EOF
