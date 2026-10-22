#!/bin/sh
# Restore helper. Run on the server from the project directory.
#
#   ops/backup/restore.sh check  <db-dump>   restore into a throwaway database
#                                            and compare row counts with the
#                                            live one (production untouched)
#   ops/backup/restore.sh db     <db-dump>   REPLACE the production database
#   ops/backup/restore.sh media  <media.tar.gz>  REPLACE the cms_media volume
#
# `db` and `media` stop the app containers first and ask for confirmation.
# After restoring an older database, the order counter is moved past the
# highest order number that could already exist in МойСклад (see below).
set -eu

cmd="${1:-}"; file="${2:-}"
[ -n "$cmd" ] && [ -n "$file" ] && [ -f "$file" ] || { sed -n '2,12p' "$0"; exit 1; }

psql_live() { docker compose exec -T db psql -U playback -d "$1" -Atc "$2"; }
TABLES="orders order_items products categories promo_codes media users payload_migrations"

confirm() {
  printf '%s Type YES to continue: ' "$1"
  read -r answer
  [ "$answer" = "YES" ] || { echo "aborted"; exit 1; }
}

case "$cmd" in
  check)
    docker compose exec -T db psql -U playback -d postgres -qc "DROP DATABASE IF EXISTS restore_check" -c "CREATE DATABASE restore_check"
    docker compose exec -T db pg_restore -U playback -d restore_check --no-owner --exit-on-error < "$file"
    echo "table               live   restored"
    for t in $TABLES; do
      printf '%-18s %6s %8s\n' "$t" "$(psql_live playback_cms "select count(*) from $t")" "$(psql_live restore_check "select count(*) from $t")"
    done
    docker compose exec -T db psql -U playback -d postgres -qc "DROP DATABASE restore_check"
    echo "restore check finished; the throwaway database was dropped"
    ;;
  db)
    confirm "This replaces the production database with $file."
    docker compose stop cms reconcile notifications
    docker compose exec -T db pg_restore -U playback -d playback_cms --clean --if-exists --no-owner --exit-on-error < "$file"
    # Orders are pushed to МойСклад as playback-site-<id>. An older dump
    # rewinds the id sequence, and a new order reusing an already-pushed id
    # would be taken for that old order and never reach МойСклад. Jump well
    # past anything created since the dump.
    psql_live playback_cms "select setval('orders_id_seq', greatest((select coalesce(max(id),0) from orders), (select last_value from orders_id_seq)) + 10000)"
    docker compose up -d
    echo "database restored; order numbers continue above the old range"
    ;;
  media)
    confirm "This replaces all uploaded images with $file."
    volume=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/media"}}{{.Name}}{{end}}{{end}}' "$(docker compose ps -aq cms)")
    [ -n "$volume" ] || { echo "cannot find the cms media volume"; exit 1; }
    docker compose stop cms reconcile
    docker run --rm -v "$volume":/data/media -v "$(cd "$(dirname "$file")" && pwd)":/restore:ro alpine:3 \
      sh -c "rm -rf /data/media/* && tar -xzf /restore/$(basename "$file") -C /data/media"
    docker compose up -d
    echo "media restored"
    ;;
  *) sed -n '2,12p' "$0"; exit 1 ;;
esac
