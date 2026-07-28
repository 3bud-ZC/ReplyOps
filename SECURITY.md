# Security Policy

ReplyOps AI handles customer conversations, provider credentials, internal API keys, and tenant-scoped business data.

## Reporting

Report security issues privately to the repository owner. Do not open public issues containing secrets, customer data, tokens, dumps, or exploit payloads with live credentials.

## Supported Surface

- Next.js dashboard and API routes
- Prisma/PostgreSQL data model
- Internal HMAC API used by n8n
- Telegram, Web Chat, and WhatsApp channel software paths
- Production deployment scripts in `scripts/`

## Secret Handling

Never commit `.env`, `SECRETS.local.env`, provider tokens, password hashes, database URLs, dumps, backups, upload contents, or generated logs. Use `.env.example` placeholders only.

## Local Checks

Run before publication:

```bash
npm run secret-scan
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
```
