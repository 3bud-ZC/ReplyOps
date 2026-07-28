# ReplyOps Production Status

Updated: 2026-07-28 23:33 Africa/Cairo

## Completion

- Overall completion: 97%
- Internal software completion: 98%
- External provider live acceptance: 60%
- Dashboard: 100%
- Arabic localization coverage: 100% for authenticated dashboard chrome and visible route UI covered by the strict source audit and browser matrix
- English localization coverage: 100% for authenticated dashboard chrome and visible route UI covered by the strict source audit and browser matrix
- Backend/runtime: 97%
- Database and migrations: 98%
- n8n v4: 91%
- Telegram software: 94%
- Telegram live acceptance: 65%
- Web Chat: 90%
- WhatsApp software: 72%
- WhatsApp live acceptance: 0% until Meta credentials are available
- Actions: 92%
- Follow-ups: 90%
- Analytics: 86%

Percentages are not 100% unless verified. This run closed the dashboard localization/RTL/visual matrix and dependency-audit gaps, deployed a new immutable release, and ran a live n8n v4 webhook subset. Full provider-live Telegram user acceptance, Meta WhatsApp live acceptance, embedded third-party Web Chat origin acceptance, and the complete 33-case signed n8n failure matrix remain external or partially unexecuted.

## Production

- Dashboard: `https://replyops.abud.fun`
- n8n: `https://botn8n.abud.fun`
- Active release: `/var/www/replyops/releases/20260728T212703Z`
- Previous release: `/var/www/replyops/releases/20260728T164805Z`
- Latest restricted backup: `/root/backups/replyops-20260728T212638Z`
- Deployed source commit: `6272a53`
- GitHub repository: `https://github.com/3bud-ZC/ReplyOps`
- Branch: `main`
- PM2 process: `replyops`, online on port `3111`
- Port `3110`: still owned by `flyrank-ai`
- Spare precheck port `3112`: stopped after validation
- PostgreSQL: accepting on local port `5433`
- n8n Docker service: restarted and recovered to HTTPS `200`

## Completed In This Run

- Added typed Arabic/English UI phrase dictionaries and exact-key parity coverage.
- Added authenticated dashboard runtime localization for visible text, labels, placeholders, titles, and page-guide chrome.
- Added `dir`/`lang` runtime sync and LTR isolation for code, URLs, emails, IDs, tokens, paths, and technical input values.
- Rendered page guides inside the dashboard layout instead of leaving guide content unused.
- Added strict dashboard source localization audit covering actual route/component source without broad exclusions.
- Added full authenticated Playwright visual matrix: 19 routes x 6 viewports x 4 locale/theme modes = 456 checks and sanitized screenshots.
- Updated Prisma packages to `7.9.1` and pinned patched `postcss` `8.5.24` and `sharp` `0.35.3` through npm overrides.
- Verified `npm audit --omit=dev` reports `0 vulnerabilities`.
- Deployed immutable release `/var/www/replyops/releases/20260728T212703Z`.
- Restarted ReplyOps PM2 and n8n Docker service, then verified recovery.
- Ran live n8n v4 webhook subset through `https://botn8n.abud.fun/webhook/replyops/v4/runtime` with QA-prefixed records and cleaned them up.

## Verified Checks

Local:

- `npm ci --loglevel=warn`: passed from updated lockfile
- `npx prisma format`: passed
- `npx prisma validate`: passed
- `npx prisma generate`: passed, Prisma Client `7.9.1`
- `npx prisma migrate deploy`: passed on disposable empty `pgvector/pgvector:pg16` database using clean baseline
- `npx prisma migrate status`: passed on the same disposable database
- `npm run typecheck`: passed
- `npm run lint`: passed with 0 errors and 0 warnings
- `npm test`: passed, 41 tests
- `npm run test:integration`: passed, 6 tests
- `npm run build`: passed
- `npm run test:e2e`: passed, 2 Playwright tests including 456 visual route checks
- `npm run secret-scan`: passed, 174 git-visible files checked
- `npm audit --omit=dev`: passed, 0 vulnerabilities

Dashboard visual matrix:

- Routes tested: 19
- Viewports tested: `1440x900`, `1280x800`, `1024x768`, `768x1024`, `430x932`, `390x844`
- Modes tested: English dark, English light, Arabic dark, Arabic light
- Total route/viewport/locale/theme combinations: 456
- Pass count: 456
- Console error count: 0
- Accessibility check: passed for unlabeled icon-only buttons
- RTL checks: passed for `dir`, sidebar side, text direction, horizontal overflow, and LTR technical content
- Machine-readable result: `scratch/visual-qa/dashboard-route-matrix.json`
- Sanitized screenshots: `scratch/visual-qa/*.png`, 456 files, ignored from git

Production release `/var/www/replyops/releases/20260728T212703Z`:

- `npm ci`: passed
- `npx prisma generate`: passed, Prisma Client `7.9.1`
- `npx prisma migrate deploy --config prisma.production.config.ts`: passed, no pending migrations
- `npx prisma migrate status --config prisma.production.config.ts`: passed, schema up to date
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 41 tests
- `npm run test:integration`: passed, 6 tests
- `npm run build`: passed
- Pre-switch `http://127.0.0.1:3112/login`: `200`
- Dashboard login HTTPS: `200`
- Dashboard anonymous `/dashboard`: `307`
- n8n HTTPS after restart recovery: `200`
- Auth smoke: valid owner login `200`, accepted password var `REPLYOPS_OWNER_CURRENT_PASSWORD`, session cookie present, HttpOnly true, SameSite true, Secure true, invalid login `401`, anonymous dashboard `307`
- Owner credential check: owner found and active, `forcePasswordChange=false`, current password matches, bootstrap password does not match
- DB smoke: `pgvector=vector`, application DB role `CREATEDB=false`
- Gemini smoke: API key present, embedding dimension `768`, generation `ok=true`
- Telegram smoke: token present, `getMe ok=true`, bot username `n8nanud_bot`
- Production audit: `npm audit --omit=dev` passed, 0 vulnerabilities
- PM2: `replyops` online; unrelated `flyrank-ai` online and untouched

## Live n8n v4 Webhook Subset

Executed against active webhook path `/webhook/replyops/v4/runtime` with run prefix `qa-live-n8n-1785274517672`.

- invalid payload: `400 invalid_payload`
- valid English request: `200`, stable response schema, `language=en`, `intent=shipping_question`
- valid Arabic request: `200`, stable response schema, `language=ar`, `intent=shipping_question`
- duplicate external message/idempotency: `200`, `deduplicated=true`, no duplicate conversation
- prompt injection: `200`, `intent=prompt_injection`
- human handoff: `200`, `handoff_required=true`
- invalid tenant: stable failure schema returned, but response used generic `[object Object]` error text and empty `request_id`; this remains a n8n normalization defect to fix before counting the full matrix complete

QA cleanup after live matrix:

- Handoffs deleted: 1
- Messages deleted: 8
- Webhook events deleted: 5
- Conversations deleted: 4
- Customers deleted: 4
- Remaining QA conversations for run prefix: 0

## Security And Dependencies

- No secrets were printed, committed, or stored in Notion.
- `.env`, `SECRETS.local.env`, dumps, logs, archives, uploads, screenshots, Playwright traces, and local agent/tool caches are ignored.
- Public docs use placeholders only.
- Production dependency audit now reports 0 vulnerabilities with `npm audit --omit=dev`.
- Full install audit still reports dev-context high advisories from non-production packages; production audit is clean.
- VPS Node is `20.20.2`; Prisma transitive package still warns it prefers Node `>=22`, but install and all release gates passed.

## Not Fully Verified

- The complete 33-case signed n8n v4 matrix is not complete. Seven live webhook cases were executed; invalid-tenant error normalization still needs correction.
- Telegram real-user acceptance sequence remains manual because it requires real user-originated Telegram messages.
- WhatsApp provider-live acceptance remains blocked by Meta credentials.
- Web Chat embedded third-party allowed-origin and blocked-origin acceptance remains open; dashboard route visual coverage passed.
- WhatsApp software remains at existing implementation level; no Meta live send/receive credential acceptance occurred.
- Actions, Follow-ups, and Analytics retained existing software coverage plus visual route coverage; no new full controlled-record calculation matrix was completed in this run.

## Safe Rollback

Application rollback:

```bash
ln -sfnT /var/www/replyops/releases/20260728T164805Z /var/www/replyops/current
pm2 restart replyops --update-env
pm2 save
```

n8n restart:

```bash
cd /opt/n8n && docker compose restart n8n
```

Backup restore source:

- `/root/backups/replyops-20260728T212638Z`

## Exact Manual Actions

- Run Telegram real-user sequence: `/start`, `/help`, shipping, unsupported product, discount, prompt injection, `/human`.
- Provide Meta WhatsApp credentials and run provider-live webhook/send acceptance.
- Run embedded Web Chat allowed-origin and blocked-origin acceptance on a temporary HTTPS page.
- Complete the remaining n8n v4 matrix cases: replayed nonce, invalid signature, missing scope, revoked/expired key, unsupported product/price, approval accepted/rejected, follow-up allow/deny/quiet-hours, Gemini timeout/degraded, ReplyOps API timeout, retry success/exhaustion, Dead Letter, System Incident, usage/analytics persistence.
- Fix n8n invalid-tenant normalization so `request_id` and exact error type are preserved.
