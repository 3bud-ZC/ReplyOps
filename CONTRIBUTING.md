# Contributing

## Local Setup

1. Copy `.env.example` to `.env` and replace placeholders with local-only values.
2. Start PostgreSQL with pgvector on port `5433`.
3. Run:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Quality Gate

Before opening a PR, run:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
npm run secret-scan
```

Provider-live tests must use real provider consoles and must be documented separately from mocked software tests.
