# certs

`russian_trusted_root_ca.crt` — Russian Trusted Root CA (Минцифры), public root
certificate, valid until 2032-02-27. Source:
https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt

Mounted read-only into the `notifications` container and passed to Node via
`NODE_EXTRA_CA_CERTS` (see `compose.yaml`). Without it the MAX API
(`platform-api2.max.ru`) fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`.

Verification stays on: do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`, the bot
token travels in an `Authorization` header.
