# Changelog

## Unreleased

- Added launch-grade repository documentation, CI, Dependabot, issue templates, PR template, and safe environment example.
- Added local secret scan command for git-visible files.
- Localized dashboard shell controls for mobile navigation, user menu fallback, and role display.
- Added typed dashboard UI localization coverage, strict source localization audit, RTL runtime sync, page guide rendering, and a 456-case authenticated Playwright visual matrix.
- Updated Prisma to 7.9.1 and pinned patched `postcss`/`sharp` transitive versions through npm overrides; production audit is clean with `npm audit --omit=dev`.
- Added structured internal/n8n error normalization so invalid tenant and upstream failure responses preserve request IDs and never collapse to `[object Object]`.
- Added the reusable n8n v4 signed matrix harness and smoke coverage for all 33 required launch cases without printing signatures or secrets, including semantic assertions for valid grounded, duplicate replay, invalid tenant, prompt-injection, and handoff paths.
- Changed the n8n v4 ReplyOps call step to a bounded `fetch` Code node so workflow output uses parsed API JSON instead of raw response stream objects.
- Updated runtime grounding behavior to use high-confidence retrieved Knowledge when the generator judge rejects an otherwise relevant source-backed answer.
- Expanded WhatsApp software handling for media/contact/location inbound metadata, invalid JSON, template send validation, and 24-hour service-window primitives.
- Added Web Chat embed customer profile fields, typing/close/focus affordances, blocked-origin safe CORS responses, and optional email persistence.
- Added WhatsApp mocked-provider policy helpers for opt-in, opt-out, quiet hours, per-customer and tenant limits, approved templates, service windows, delivery status transitions, and redacted credential summaries.
- Added atomic Action execution claiming, required-field validation, approval/rejection identity and timestamps, redacted auth logging, bounded response-size enforcement, and redirected final-host SSRF validation for custom Action HTTP connectors.
- Added Follow-up schedule evaluation for disabled rules, consent, opt-out, handoff, resolved conversations, duplicate jobs, quiet hours, limits, retry delay, and lock-expiry claim semantics.
- Added Analytics calculation helpers and Dashboard metrics for conversations, handoffs, knowledge gaps, delivery failures, token totals, and dead letters.
- Added tenant-scoped Onboarding progress route with validation, resume, skip, completion, and replay-tour state.
- Added production final-acceptance harness for QA-prefixed DB-seeded Web Chat, WhatsApp mock-provider, Actions, Follow-ups, Analytics, Onboarding, Telegram replay, and cleanup matrices.
- Added optional WhatsApp mock Graph base URL support for controlled software acceptance while keeping real Meta Graph API as the default.
- Updated archive secret scanning and release ignores so deployment-created symlinks and local release tarballs do not create false positives.

Provider-live acceptance remains tracked separately in `STATUS.md`.
