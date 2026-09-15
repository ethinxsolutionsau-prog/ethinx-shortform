# HOOKED_UP — Storefront live 2026-09-15

What happened, how to verify, what's still open, and how to roll back.

## Live now
- `https://ethinx.solutions/` and `https://www.ethinx.solutions/` serve the **storefront** from
  **ethinx-shortform on port 3001** (Next 14.2.5, `systemd ethinx-shortform.service`).
- `https://app.ethinx.solutions/` and `https://shortform.ethinx.solutions/` use the **same caddy site block**
  and the same SAN cert — both return 200 (were 525 / NXDOMAIN before the 2026-09-15 fix).
- `/enterprise`, `/question`, `/privacy` restored (copied from the release repo, styled to the storefront).
- `/api/enterprise` implemented on the factory (validates + saves to `EnterpriseInquiry`, returns 201).
- Pack locking: storefront CTAs only ever link `/new?pack=four` or `/new?pack=single` (any other `?pack=` is
  ignored; `utm_*` params are preserved). The `/new` form reads the pack from the URL, sends it to the API, and
  the job is stored with `pack` + `price` (`four`=550 AUD, `single`=199 AUD).
- `/api/payments` returns live PayPal IDs: single `3U2WSMUELZL8Q`, four-pack `A4Y67YLZJZQSW`. `DODO_ENABLED=false`,
  so the UI shows PayPal + bank, with the pack-aware callout on `/review/<id>`.

### Routing (public path)
Cloudflare (proxied A record) → **Caddy :443** (real SAN cert, DNS-01 via acme.sh) → `127.0.0.1:3001`.
nginx is NOT the public layer here (it only serves localhost service ports), so the proxy change was made in
`/etc/caddy/Caddyfile` (backed up in `/root/backups/deploy-snapshot-20260915-171242/Caddyfile.*`).

Caddy site block `ethinx.solutions, www, app, shortform` now routes to 3001: `/`, `/api/*`, `/_next/*`, `/new*`,
`/review/*`, `/brief/*`, `/jobs/*`, `/demo/*`, `/uploads/*`, `/enterprise*`, `/question*`, `/privacy*`,
`/funnel/*`, `/v/*`.
Preserved: `/api/orders*` + `/shortform-assets/*` → 3002 (legacy release funnel), `/webhook/*` → 5678,
`/bridge/*` → 18081, `/videos/*` + `/vega/*` → file servers, `/trade*` + `/partners*` → 3100 (dead backend, kept).

### TLS (2026-09-15 reissue)
- Cert reissued via acme.sh with all 10 SANs (added `app` + `shortform`): `--issue --dns dns_cf` using
  `CF_Token` from `/etc/letsencrypt/cloudflare.ini`. ECDSA `ec-256`, renewed in acme.sh's ARI window.
  Installed to `/etc/caddy/certs/ethinx.solutions.{crt,key}` (chown `caddy:caddy`), `systemctl reload caddy`.
- Cloudflare: **`shortform` A record created (proxied, → 91.99.162.243)**; `ethinx.solutions` + `app`
  were already A + proxied to the same IP.

## Verify
```bash
curl -s https://ethinx.solutions/ | grep -oE '<title>[^<]*</title>'                       # EthinX | Short-form...
curl -s "https://ethinx.solutions/?pack=evil&utm_campaign=launch" | grep -oE 'href="/new[^"]*"'
#   -> only /new?pack=four(/single) with utm_campaign preserved
curl -s -o /dev/null -w "%{http_code}\n" https://ethinx.solutions/enterprise             # 200
curl -s https://ethinx.solutions/api/payments                                            # pays...4pack A4Y67YLZJZQSW
curl -s -o /dev/null -w "%{http_code}\n" "https://app.ethinx.solutions/new?pack=single"      # 200 (was 525)
curl -s -o /dev/null -w "%{http_code}\n" "https://shortform.ethinx.solutions/new?pack=four"  # 200 (was NXDOMAIN)
sudo tail -n 3 /tmp/enterprise-inquiries.log   # enterprise alert log (one JSON line per inquiry)
# DB (pack/price persisted):
#   SELECT id, pack, price, state FROM "Job" ORDER BY "createdAt" DESC LIMIT 3;
#   SELECT id, "businessName", email, status, alerts FROM "EnterpriseInquiry" ORDER BY "createdAt" DESC LIMIT 3;
```

## Open items / gaps
- **Git — RESOLVED 2026-09-15**: `origin/main` had been rewritten with the *release* codebase's history
  (parallel tree, no fast-forward). Decision: **storefront-live is truth** → `main` was force-pushed
  (`--force-with-lease`) from `9733146` to `58d85e6`. Old main/release-funnel history is preserved as branch
  **`main-backup-20260915`** (also `storefront-live-20260915` = `58d85e6`). Schema (`Job.pack/price`,
  `EnterpriseInquiry`) confirmed present in `58d85e6` before the push.
- **`app` + `shortform` — RESOLVED 2026-09-15**: SAN cert extended (both hostnames issued), caddy site block
  includes them, `shortform` A record created proxied → 91.99.162.243. Both return 200.
- **Enterprise alerts — WIRED 2026-09-15**: on a successful inquiry POST, `/api/enterprise` now:
  1. appends one JSON line to **`/tmp/enterprise-inquiries.log`**,
  2. `console.log`s the same line (visible in `journalctl -u ethinx-shortform`),
  3. if **`ENTERPRISE_EMAIL_WEBHOOK_URL`** is set in the factory `.env`, fires a best-effort POST
     (8 s timeout, non-blocking) to route the alert to `hello@ethinx.solutions` (payload includes `to`).
  Response stays **201**. The webhook var is currently **empty** — the server has **no MTA/SMTP/client**,
  so an external transport (n8n/webhook/SMTP gateway) must be pointed at that var before email actually leaves.
  Status of logging/email for each inquiry is stored in `EnterpriseInquiry.alerts`.
- **Payments**: PayPal is manual reconciliation. `/api/jobs/<id>/mark-paid` exists (audit-logged) but payment
  isn't auto-verified; delivery unlocks after HUMAN_REVIEW → APPROVED as before. Dodo UI stays hidden while
  `DODO_ENABLED=false`.
- **Server secrets archive**: `/root/backups/SERVER-SECRETS-2026-09-15.tar.gz.gpg` (AES256 symmetric) contains
  factory `.env`, `.env.bak`, `.env.production` + release `.env.production`. **Passphrase is held by the user /
  NOT stored on this or any server** — the archive is useless without it.
- **Test rows created during verification** (delete if not wanted):
  `cmu2xn5sb0000nm3gcngb00cj` (four/550), `cmu2xn5t60003nm3gpsg94vby` (single/199),
  `cmu2xnd370006nm3g735lj3bu` (EnterpriseInquiry "Coastal Kitchens"). (2026-09-15 alert-test rows were deleted.)
- `.env.bak`, `.env.production`, `.next.prev/` remain untracked in git (intentionally not committed; never
  `git add -A`).

## Rollback
- **App**: `.next.prev` holds the pre-deploy build.
  `systemctl stop ethinx-shortform && cd /root/ethinx-shortform && mv .next .next.new && mv .next.prev .next && systemctl start ethinx-shortform`
- **Zip fallback**: `/root/backups/deploy-snapshot-20260915-171242/.next-live-20260915-171242.zip`
- **Caddy**: restore `/root/backups/deploy-snapshot-20260915-171242/Caddyfile.*` → `/etc/caddy/Caddyfile`, `systemctl reload caddy`
- **DB**: change was purely additive (`Job.pack`, `Job.price`, new `EnterpriseInquiry`). `video_closer_funnel`
  (5 rows) was **not** touched. Rolling back = delete the two columns + table if ever needed.

Backups dir: `/root/backups/deploy-snapshot-20260915-171242/` (live `.next`, Caddyfile, cloudflared config,
full `nginx -T`, service statuses).
Cert reissue inputs: `/root/.acme.sh/ethinx.solutions_ecc/` (live SAN list in `ethinx.solutions.conf`),
`/etc/letsencrypt/cloudflare.ini` (DNS-01 token).