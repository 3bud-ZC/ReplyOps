# ReplyOps Production Status

Updated: 2026-07-28 00:00 Africa/Cairo

## 1. Current Verified Percentages

- Overall completion: 93%
- Internal software completion: 98%
- External provider live acceptance: 58%
- Dashboard: 98%
- Backend/runtime: 96%
- Database and migrations: 92%
- n8n v4: 86%
- Telegram software: 92%
- Telegram live acceptance: 60%
- Web Chat: 88%
- WhatsApp software: 72%

Percentages are not 100%. Remaining gaps are real Telegram owner-user sequence, full embedded Web Chat visual acceptance, WhatsApp provider-live acceptance after Meta credentials, complete n8n v4 execution matrix, and dependency advisory remediation that needs framework/vendor review.

## 2. Current Production Infrastructure

- VPS: `167.99.157.6`
- Dashboard: `https://replyops.abud.fun`
- n8n: `https://botn8n.abud.fun`
- PM2 process: `replyops`
- ReplyOps internal port: `3111`
- Port `3110`: still owned by `flyrank-ai`; not touched.
- PostgreSQL database: `replyops_app`
- PostgreSQL: local port `5433`
- n8n: local port `5678`

## 3. Active Release, Backup, Migrations

- Active release: `/var/www/replyops/releases/20260727T095016Z`
- Previous release: `/var/www/replyops/releases/20260727T015923Z`
- Latest restricted backup: `/root/backups/replyops-20260727T122129Z`
- Backup completed before this final launch run. `pg_restore -l`, v3/v4 workflow JSON parsing, PM2 dump presence, shared configuration copies, n8n Compose, and Telegram webhook metadata were validated without exposing protected values.
- Finished Prisma migrations: 8
- Migration state: `npx prisma migrate status` reports database schema is up to date.

## 4. Completed This Turn

- Added public-launch repository scaffolding: `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `.env.example`, `.gitattributes`, GitHub Actions CI, Dependabot, issue templates, and PR template.
- Added `npm run secret-scan` for git-visible publication candidates. The scanner blocks committed env files, secret-bearing local files, dumps, logs, archives, upload contents, private keys, and likely token/password assignments.
- Replaced the starter Next.js README with product-specific ReplyOps documentation covering architecture, stack, local setup, environment placeholders, n8n, testing, deployment, security model, status tracking, and contribution rules.
- Localized dashboard shell labels for mobile navigation, primary navigation, account fallback, and role display.
- Added smoke tests for repository safety files, README content, safe `.env.example`, CI launch gates, dictionary key parity, and localized dashboard shell labels.
- Created and validated restricted pre-change backup `/root/backups/replyops-20260727T122129Z`.
- Consolidated `STATUS.md` and the n8n v3/v4 exports into the canonical application repository; exactly one project status file remains.
- Re-ran the local launch baseline: clean install, Prisma format/validate/generate, typecheck, lint, 33 unit/smoke tests, 5 integration contract tests, 1 source-only route test, and the production build passed.
- Local `prisma migrate status` could not connect because the configured local PostgreSQL endpoint on `localhost:5433` was unavailable; production migration state remains to be reverified directly.
- Expanded n8n v4 from compact bridge to a normalized HMAC runtime orchestration workflow.
- Imported and activated workflow `replyops-dashboard-backed-v4` in n8n.
- Added stable internal response contract for channel runtime responses.
- Added request IDs through `/api/internal/messages/incoming`.
- Added runtime intent, language, sentiment, confidence, knowledge gap, grounding, handoff, action, follow-up, usage, timing, and source fields.
- Added Gemini provider failure classification and controlled fallback behavior.
- Added prompt-injection and discount-approval policy ordering to runtime contract tests.
- Added dead-letter/system-event handling for Gemini degraded states.
- Updated System Health to distinguish Gemini, Telegram, Web Chat, and WhatsApp configured/degraded/not-configured states.
- Removed vulnerable `xlsx` parsing dependency and switched Excel parsing to `read-excel-file`.
- Pinned Prisma to `7.8.0` and ESLint to `9.39.5` after compatibility validation.
- Added direct `@emnapi` runtime dependencies so Linux `npm ci` matches the lockfile.

## 5. Live Production Verification

- Active symlink: `/var/www/replyops/current` -> `/var/www/replyops/releases/20260727T095016Z`.
- Dashboard HTTP: `200`.
- Login HTTP: `200`.
- n8n HTTP: `200`.
- PostgreSQL on `127.0.0.1:5433`: accepting connections.
- Nginx config: `nginx -t` successful.
- PM2: `replyops` online on `3111`.
- Port `3110`: still `flyrank-ai`.
- Spare validation port `3112`: stopped after precheck.
- n8n containers: n8n and database containers running.
- n8n workflow export verified ID/name/active state and `Stable Response` node in exported JSON.
- n8n invalid-envelope smoke: POST `{}` to `/webhook/replyops/v4/runtime` returned `400` with `invalid_payload` and the expected missing field list.
- Provider smoke: `GEMINI_API_KEY` present, embedding model returned dimension `768`, generation model `gemini-2.5-flash` returned `ok=true`, Telegram `getMe` returned `ok=true` for bot username `n8nanud_bot`.
- Failed pre-switch release directories from this turn were cleaned; active release stayed `/var/www/replyops/releases/20260727T095016Z`.

## 6. Automated Test Results

Local `replyops-dashboard`:

- `npm ci`: passed
- `npx prisma generate`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 33 tests
- `npm run test:integration`: passed, 5 tests
- `npm run test:e2e`: passed, 1 test
- `npm run build`: passed

Production release `/var/www/replyops/releases/20260727T095016Z`:

- `npm ci`: passed
- `npx prisma generate`: passed
- `npx prisma migrate deploy`: passed, no pending migrations
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 33 tests
- `npm run test:integration`: passed, 5 tests
- `npm run test:e2e`: passed, 1 test
- `npm run build`: passed
- Pre-switch health on port `3112`: `200`
- Post-deploy `npm test` from `/var/www/replyops/current`: passed, 33 tests

## 7. Security And Dependency Status

- No secrets were written to source or output.
- Runtime responses expose structured error classes, not provider secrets.
- n8n v4 signs requests with HMAC from environment values and does not hardcode tenant IDs or tokens.
- `npm audit --omit=dev` currently reports 7 advisories: 4 moderate, 3 high, 0 critical.
- Remaining production advisories are in Prisma dev/runtime transitive packages, Next/PostCSS/sharp, and next-auth. Available automated fixes imply framework/vendor version changes and were not applied blindly.

## 8. Not Reverified This Turn

- Authenticated 11-route visual QA was not rerun after release `20260727T095016Z`.
- Lighthouse was not rerun after release `20260727T095016Z`.
- Real Telegram user-originated message sequence was not executed.
- WhatsApp provider-live acceptance remains blocked by missing Meta credentials.
- Full embedded Web Chat visual acceptance remains unverified.
- Full n8n v4 end-to-end execution matrix remains open.

## 9. Safe Rollback

Application rollback:

```bash
ln -sfnT /var/www/replyops/releases/20260727T015923Z /var/www/replyops/current
pm2 restart replyops --update-env
pm2 save
```

n8n rollback:

```bash
docker exec n8n-n8n-1 n8n update:workflow --id=replyops-dashboard-backed-v4 --active=false
cd /opt/n8n && docker compose restart n8n
```

Backup restore sources:

- Full latest backup: `/root/backups/replyops-20260727T122129Z`
- Database dump: `/root/backups/replyops-20260727T122129Z/replyops_app.dump`
- Nginx config: `/root/backups/replyops-20260727T122129Z/replyops.nginx.conf`
- PM2 dump: `/root/backups/replyops-20260727T122129Z/pm2-dump.pm2`
- n8n workflows: `/root/backups/replyops-20260727T122129Z/n8n-workflows-all.json`

## 10. Remaining Work

- Execute real Telegram account acceptance: `/start`, `/help`, shipping, unsupported product, discount, injection, `/human`.
- Verify full embedded Web Chat on desktop and mobile.
- Complete WhatsApp provider-live acceptance after Meta credentials are supplied.
- Run complete n8n v4 matrix: valid envelope, invalid envelope, duplicate idempotency, provider retry/degraded path, dead-letter path, action approval, follow-up creation, and stable response schema.
- Review dependency advisories against upstream Next, Prisma, sharp, PostCSS, and next-auth releases before another security hardening release.
