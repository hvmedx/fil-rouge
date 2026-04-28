#!/usr/bin/env bash
set -euo pipefail
for c in mycontacts-api mycontacts-web mycontacts-landing; do
    docker rm -f "$c" 2>/dev/null || true
done
echo "App containers removed (mongo + devops stack untouched)."
