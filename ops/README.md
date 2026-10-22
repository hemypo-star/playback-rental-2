# Operations: backups, restore, rollback

Ships with the `prod` branch. All commands run on the server from the project
directory (`/var/www/playback-rental-2`).

## Backups

The `backup` service in `compose.yaml` writes a set every night at
`BACKUP_TIME` (default 03:30, Kemerovo time) into `BACKUP_DIR` on the host
(default `/var/backups/playback`) and keeps `BACKUP_RETENTION_DAYS` (14):

| File | Contents |
|---|---|
| `db-YYYYMMDD-HHMM.dump` | the whole database, `pg_dump -Fc` |
| `media-YYYYMMDD-HHMM.tar.gz` | uploaded images (`cms_media` volume) |
| `notifications-YYYYMMDD-HHMM.tar.gz` | notification queue (pending and failed jobs) |

On first start, and whenever the last good set is older than 26 h, it makes
a set immediately. `docker compose ps backup` shows `unhealthy` when no set has
succeeded for 26 h.

```bash
ls -lh /var/backups/playback            # what is there
docker compose logs --tail=20 backup    # last runs
```

**The copies live on the same server.** They cover a bad deploy, a broken
migration or a mistake in the admin — not the loss of the server or its disk.
When an off-server place appears, copy the directory there (e.g. `rclone sync
/var/backups/playback remote:playback` from cron).

The files contain customers' personal data: keep the directory readable by
root only (`chmod 700 /var/backups/playback`).

## Checking a backup (production untouched)

```bash
ops/backup/restore.sh check /var/backups/playback/db-YYYYMMDD-HHMM.dump
```

Restores into a throwaway database `restore_check`, prints row counts next to
the live ones, and drops it. Do this once a month.

## Restoring

```bash
ops/backup/restore.sh db    /var/backups/playback/db-YYYYMMDD-HHMM.dump
ops/backup/restore.sh media /var/backups/playback/media-YYYYMMDD-HHMM.tar.gz
```

Each asks for `YES`, stops the app containers, restores and starts them again.
After a database restore, order numbers continue 10 000 above the old range:
orders reach МойСклад as `playback-site-<number>`, and reusing a number that was
already sent would make a new order look like an old one and never arrive there.

## Deploy

```bash
git fetch && git reset --hard origin/prod && docker compose up -d --build
docker compose ps        # every service "healthy" within ~2 min
```

`git pull` does not work here: `prod` is regenerated on every release and
force-pushed.

## Rollback

Every release is tagged `release-YYYYMMDD-HHMM-<sha>` in the repository.

```bash
git fetch --tags
git tag -l 'release-*' | tail -5                 # recent releases
git reset --hard release-YYYYMMDD-HHMM-xxxxxxx   # the one before
docker compose up -d --build
```

Migrations only ever add (columns, tables, indexes), so the previous release
runs on a database the newer one has migrated. If a release notes a
destructive migration, restore the database backup taken before it instead.

## First-time checks after this version

- `WEB_BIND`: the app is now published on `127.0.0.1:${WEB_PORT}` only. If the
  reverse proxy (nginx/Caddy) runs on this same host and proxies to
  `127.0.0.1:8080`, nothing changes. If it runs elsewhere, set
  `WEB_BIND=0.0.0.0` in `.env` and close the port in the firewall to everything
  but the proxy.
- `TRUST_PROXY_HEADERS=true` and `WEB_URL=https://…` in `.env`.
- `sudo mkdir -p /var/backups/playback && sudo chmod 700 /var/backups/playback`
  (or set `BACKUP_DIR`).
- Uptime monitoring: point it at `https://<domain>/api/health` (200 only while
  the app reaches the database).
