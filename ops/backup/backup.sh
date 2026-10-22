#!/bin/sh
# Nightly backup loop for the `backup` service in compose.yaml.
#
# Writes into /backups (a host directory, BACKUP_DIR in .env):
#   db-<stamp>.dump              pg_dump custom format of playback_cms
#   media-<stamp>.tar.gz         the cms_media volume (product and kit images)
#   notifications-<stamp>.tar.gz the notification queue (pending/failed jobs)
# and deletes sets older than BACKUP_RETENTION_DAYS. A set is written under a
# .partial name and renamed only when complete, so a crash never leaves a
# truncated file that looks like a good backup.
#
# Copies live on the same server: they cover a broken deploy, a bad migration
# or an operator mistake, NOT the loss of the server or its disk. Set
# BACKUP_RCLONE_REMOTE later if an off-server location appears (ops/README.md).
set -eu

BACKUP_TIME="${BACKUP_TIME:-03:30}"            # local time (TZ), HH:MM
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
OUT=/backups
: "${PGHOST:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') backup: $*"; }

run_backup() {
  stamp=$(date '+%Y%m%d-%H%M')
  log "starting set $stamp"
  pg_dump -Fc -f "$OUT/db-$stamp.dump.partial"
  mv "$OUT/db-$stamp.dump.partial" "$OUT/db-$stamp.dump"
  tar -czf "$OUT/media-$stamp.tar.gz.partial" -C /data/media .
  mv "$OUT/media-$stamp.tar.gz.partial" "$OUT/media-$stamp.tar.gz"
  tar -czf "$OUT/notifications-$stamp.tar.gz.partial" -C /data/notifications .
  mv "$OUT/notifications-$stamp.tar.gz.partial" "$OUT/notifications-$stamp.tar.gz"
  find "$OUT" -maxdepth 1 -type f \( -name 'db-*' -o -name 'media-*' -o -name 'notifications-*' \) -mtime +"$RETENTION_DAYS" -delete
  find "$OUT" -maxdepth 1 -type f -name '*.partial' -mmin +180 -delete
  date '+%s' > "$OUT/.last-success"
  log "set $stamp done: $(du -sh "$OUT/db-$stamp.dump" | cut -f1) db, $(du -sh "$OUT/media-$stamp.tar.gz" | cut -f1) media"
}

attempt() {
  if run_backup; then return 0; fi
  log "FAILED — will retry in 30 min"
  rm -f "$OUT"/*.partial
  sleep 1800
  run_backup || log "FAILED again — next attempt at $BACKUP_TIME"
}

mkdir -p "$OUT"
log "started; daily at $BACKUP_TIME ($(date +%Z)), keeping $RETENTION_DAYS days in $OUT"

# A fresh install, or a server that was down at BACKUP_TIME, gets a set now
# instead of waiting up to a day.
last=$(cat "$OUT/.last-success" 2>/dev/null || echo 0)
if [ $(( $(date +%s) - last )) -gt 93600 ]; then attempt; fi

done_today=""
while true; do
  now=$(date '+%H:%M'); today=$(date '+%Y%m%d')
  if [ "$now" = "$BACKUP_TIME" ] && [ "$done_today" != "$today" ]; then
    done_today=$today
    attempt
  fi
  sleep 20
done
