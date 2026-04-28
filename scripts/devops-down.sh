#!/usr/bin/env bash
# Stop the DevOps stack. Pass --wipe to also delete volumes (Jenkins config, Sonar DB, Mongo data).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "${1:-}" = "--wipe" ]; then
    echo "Wiping volumes (Jenkins config, Sonar, Mongo) — irreversible..."
    docker compose -f devops/docker-compose.yml down -v
else
    docker compose -f devops/docker-compose.yml down
    echo "Stack stopped. Volumes preserved. Use --wipe to also delete data."
fi
