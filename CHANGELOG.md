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
- Added bounded response-size enforcement for custom Action HTTP connectors.

Provider-live acceptance remains tracked separately in `STATUS.md`.
