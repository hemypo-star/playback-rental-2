#!/bin/sh
# Runs every command of the runtime image (the app, migrations, the
# notification and МойСклад workers) as the unprivileged `node` user.
#
# It starts as root only to hand the data volumes to `node`: volumes created
# by earlier releases, which ran everything as root, are root-owned, and the
# app has to keep writing uploads and notification jobs into them. Only
# entries not already owned by `node` are touched, so a restart is cheap.
set -e

if [ "$(id -u)" = "0" ]; then
  for dir in /data/media /data/notifications; do
    if [ -d "$dir" ]; then
      find "$dir" ! -user node -exec chown node:node {} +
    fi
  done
  # setpriv keeps the environment; pnpm reads its config from $HOME.
  export HOME=/home/node
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
