# ReplyOps Production Status

Updated: 2026-07-28 18:29 Africa/Cairo

## Completion

- Overall completion: 94%
- Internal software completion: 98%
- External provider live acceptance: 60%
- Dashboard: 98%
- Backend/runtime: 97%
- Database and migrations: 94%
- n8n v4: 88%
- Telegram software: 94%
- Telegram live acceptance: 65%
- Web Chat: 88%
- WhatsApp software: 72%
- WhatsApp live acceptance: 0% until Meta credentials are available
- Actions: 92%
- Follow-ups: 90%
- Analytics: 86%

Percentages are not 100%. Remaining gaps are full authenticated visual QA, real Telegram owner-user acceptance sequence, full embedded Web Chat visual acceptance, WhatsApp provider-live acceptance, full n8n v4 execution matrix, and dependency advisories that require framework/vendor updates.

## Production

- Dashboard: `https://replyops.abud.fun`
- n8n: `https://botn8n.abud.fun`
- Active release: `/var/www/replyops/releases/20260728T152053Z`
- Previous release: `/var/www/replyops/releases/20260728T151302Z`
- Latest restricted backup: `/root/backups/replyops-20260728T151022Z`
- Deployed source commit: `f67c3d1`
- PM2 process: `replyops`, online on port `3111`
- Port `3110`: still owned by `flyrank-ai`
- Spare precheck port `3112`: stopped after validation
- PostgreSQL: accepting on local port `5433`
- n8n: restarted and recovered to HTTPS `200`
- Prisma migrations: 8 applied, schema up to date

## Completed In This Run

- Added public-launch repository scaffolding: product README, safe `.env.example`, security/contribution docs, changelog, code of conduct, GitHub Actions CI, Dependabot, issue templates, PR template, and `.gitattributes`.
- Added `npm run secret-scan` and publication guards for env files, dumps, logs, archives, private keys, uploads, and likely committed credentials.
- Localized dashboard shell labels for primary navigation, mobile navigation, account fallback, and role display.
- Added tests for docs/CI presence, README product content, `.env.example` placeholder safety, CI gate coverage, dictionary parity, and localized shell labels.
- Added immutable deploy helper and production auth diagnostics.
- Reset owner bootstrap credential hash from server-side env, cleared stale owner login rate-limit buckets, and verified secure auth cookie behavior without printing secrets.
- Created restricted backup and added all n8n workflow export to it.
- Deployed immutable release `/var/www/replyops/releases/20260728T152053Z`.
- Restarted ReplyOps PM2 and n8n Docker service, then reverified both.

## Verified Checks

Local:

- `npm ci`: passed
- `npx prisma format`: passed
- `npx prisma validate`: passed
- `npx prisma generate`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 39 tests
- `npm run test:integration`: passed, 5 tests
- `npm run test:e2e`: passed, 1 source route test
- `npm run build`: passed
- `npm run secret-scan`: passed, 166 git-visible files checked
- `npm audit --omit=dev`: 7 advisories, 0 critical

Production release `/var/www/replyops/releases/20260728T152053Z`:

- `npm ci`: passed
- `npx prisma generate`: passed
- `npx prisma migrate deploy`: passed, no pending migrations
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 39 tests
- `npm run test:integration`: passed, 5 tests
- `npm run test:e2e`: passed, 1 source route test
- `npm run build`: passed
- Pre-switch `http://127.0.0.1:3112/login`: `200`
- Dashboard HTTPS: `200`
- Login HTTPS: `200`
- n8n HTTPS after restart: `200`
- Auth smoke: valid owner login `200`, session cookie present, HttpOnly true, SameSite true, Secure true, invalid login `401`, anonymous dashboard `307`
- Gemini smoke: API key present, embedding dimension `768`, generation `ok=true`
- Telegram smoke: token present, `getMe ok=true`, bot username `n8nanud_bot`
- n8n invalid envelope: `400 invalid_payload` with expected missing fields
- PM2: `replyops` online; unrelated `flyrank-ai` online and untouched

## Security And Dependencies

- No secrets were printed or committed.
- `.env`, `SECRETS.local.env`, dumps, logs, archives, uploads, and local agent/tool caches are ignored.
- Public docs use placeholders only.
- Remaining `npm audit --omit=dev` advisories: 4 moderate, 3 high, 0 critical.
- Reported compatible automated fixes require `npm audit fix --force` and breaking framework/vendor changes involving Prisma/Next/PostCSS/sharp. Not applied blindly.
- VPS Node is `20.20.2`; Prisma transitive package warns it prefers Node `>=22`, but install and all release gates passed.

## Not Fully Verified

- Full authenticated browser visual QA across all dashboard routes, viewports, themes, and locales was not rerun in this session.
- Complete Arabic coverage is improved at shell level but repository-wide page string localization is still incomplete.
- Real Telegram user-originated acceptance sequence remains manual.
- WhatsApp provider-live acceptance remains blocked by Meta credentials.
- Full embedded Web Chat visual acceptance remains open.
- Full n8n v4 execution matrix remains open beyond invalid-envelope smoke and source contract tests.
- GitHub CI status, tag, release, and Notion documentation are pending until publication completes.

## Safe Rollback

Application rollback:

```bash
ln -sfnT /var/www/replyops/releases/20260728T151302Z /var/www/replyops/current
pm2 restart replyops --update-env
pm2 save
```

n8n restart:

```bash
cd /opt/n8n && docker compose restart n8n
```

Backup restore source:

- `/root/backups/replyops-20260728T151022Z`

## Exact Manual Actions

- Complete owner password change after bootstrap login.
- Run Telegram real-user sequence: `/start`, `/help`, shipping, unsupported product, discount, prompt injection, `/human`.
- Provide Meta WhatsApp credentials and run provider-live webhook/send acceptance.
- Run full dashboard visual QA matrix: 1440x900, 1280x800, 1024x768, 768x1024, 430x932, 390x844 across English/Arabic and dark/light.
- Run full n8n v4 matrix: valid envelope, duplicate idempotency, degraded provider path, dead letter, action approval, follow-up creation, stable response schema.
