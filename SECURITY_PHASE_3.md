# Security Phase 3 operations

## Phase 3.3A: read-only data accuracy audit

The authenticated `/admin/operations` page now includes a read-only reconciliation audit sourced exclusively from the existing Sanity dataset. It does not mutate, delete, migrate, or backfill records and does not contact CCAvenue or any other external service.

The dashboard documents the source, inclusion rule, confidence classification, and Asia/Kolkata window for every KPI. Data-quality checks cover duplicate business/payment identifiers, missing transaction identifiers, online payments pending beyond 24 hours, invalid amounts/dates/statuses, total arithmetic, canonical ownership, and subscription requirements/schedules. Counts scan the relevant record population, while displayed samples are capped at 25 records per check.

All returned sample identifiers are replaced server-side with keyed 12-character HMAC labels. Projections omit customer names, email addresses, phone numbers, addresses, credentials, card tokens, and payment secrets. Audit access reuses the signed administrator session required by the existing operations endpoint.

COD and CCAvenue populations are shown separately. Both are application database records: a `success` payment status or tracking ID does **not** prove that CCAvenue settled funds. Settlement requires separately exported gateway records and human-controlled reconciliation; this phase deliberately makes no gateway call.

No paid service or new Vercel environment variable is required. The implementation reuses Sanity and `AUTH_SESSION_SECRET`; this change does not edit Vercel configuration.
