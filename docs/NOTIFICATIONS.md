# Direct notifications on the VDS

Playback Rental does **not** require n8n for order/contact notifications.

The application uses two local processes on the same Docker host:

1. `cms` writes `order.created` / `contact.created` jobs to the persistent `notification_queue` volume.
2. `notifications` reads that queue and delivers each job directly to configured destinations.

The web container receives only `NOTIFICATIONS_ENABLED` and the queue path. Telegram, MAX, VK and SMTP credentials are passed only to the worker container.

## Delivery semantics

- Queue writes are atomic (`*.tmp` -> rename), so checkout does not wait for messenger/SMTP providers.
- Every destination has independent `pending` / `sent` / `failed` state.
- A failure in one destination does not resend destinations that already succeeded.
- Default policy: 5 attempts, starting at 5 seconds with exponential backoff (capped at 5 minutes).
- A worker restart recovers jobs left in `processing/` back to the pending queue.
- Completed and terminally failed jobs remain under `sent/` and `failed/` for diagnosis.
- Notification failure never rolls back an otherwise-valid checkout. Contact form submission reports success once the durable local job is accepted.

## Telegram

Create/use a bot and configure:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_IDS=123456789,987654321
```

Multiple chat IDs are comma-separated.

## MAX

Create a MAX bot and configure:

```env
MAX_BOT_TOKEN=...
MAX_USER_IDS=123456789,987654321
```

The worker calls `POST https://platform-api2.max.ru/messages?user_id=...` and sends the token in the `Authorization` header. MAX currently limits a bot to two messages per second to one dialog; this architecture naturally serializes deliveries for a job.

**Security:** the token that appeared in the previously exported n8n workflow must be rotated before production. Never copy that exposed token into the new `.env`.

## VK (optional)

A VK community can send notifications through `messages.send` after community messages are enabled and the target user/conversation is allowed to receive messages from the community.

```env
VK_ACCESS_TOKEN=...
VK_PEER_IDS=123456789,2000000001
VK_API_VERSION=5.199
```

`VK_PEER_IDS` accepts the normal VK `peer_id` values. The worker derives a deterministic non-zero `random_id` from the queue job + recipient, so a retry of the same queued delivery is deduplicated by VK rather than becoming a second message.

Leave `VK_ACCESS_TOKEN` / `VK_PEER_IDS` empty to disable VK without affecting other channels.

## Email / SMTP

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=Playback Rental <info@playbackrental.ru>
SMTP_ADMIN_TO=PlaybackRental@yandex.ru
```

- Port `465` + `SMTP_SECURE=true`: implicit TLS.
- Port `587` + `SMTP_SECURE=false`: mandatory STARTTLS.
- There is deliberately no plaintext SMTP fallback.
- `SMTP_ADMIN_TO` may contain multiple comma-separated addresses.
- Orders send both the admin notification and a confirmation to the customer email used at checkout.
- Contact-form messages go to admin destinations only.

## Enable production delivery

After at least one channel is configured on the VDS:

```env
NOTIFICATIONS_ENABLED=true
```

Then start/recreate the stack:

```bash
docker compose up -d --build
```

Useful diagnostics:

```bash
docker compose logs -f notifications
docker compose exec notifications sh -lc 'find /data/notifications -maxdepth 2 -type f | sort'
```

Normal local/Codespaces development uses `compose.dev.yaml`, which disables the worker and forces notifications off so test orders cannot message real recipients.

## Final acceptance on the VDS

Before cutover, send one disposable order/contact event and verify:

- every configured Telegram recipient receives exactly one message;
- every configured MAX recipient receives exactly one message;
- admin SMTP email arrives;
- order customer confirmation arrives;
- if configured, every VK peer receives exactly one message;
- stopping/restarting the worker with a pending job does not lose the job;
- temporarily breaking one test destination causes retries while already-successful destinations are not duplicated;
- secrets do not appear in queue JSON or application logs.
