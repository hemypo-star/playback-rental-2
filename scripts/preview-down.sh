#!/usr/bin/env bash
# Stop the preview stack and delete its database volume.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose --env-file .env.preview -f compose.yaml -f compose.preview.yaml down -v
echo "preview: stopped, database volume removed"
