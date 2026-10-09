# PR229 — E-commerce go-live readiness gate

This document is an audit checklist, **not evidence that third-party integrations are live**.

## Release blockers

| Area | Acceptance gate | Evidence required |
| --- | --- | --- |
| Bank transfer | Pending order; staff confirms receipt against bank statement; idempotent confirmation; ledger credit; customer notified once | Isolated integration tests and staff UAT |
| Virtual POS | Provider contract, sandbox credentials, signed callback verification, amount/currency/order matching, replay protection, refunds | Provider sandbox test receipts; no secrets in repo |
| Inventory | Atomic stock allocation for simultaneous orders, cancellation release, no negative available stock, warehouse picking reconciliation | Two-client concurrency tests on ephemeral PostgreSQL |
| Cargo | Carrier mapping, label/tracking number, authenticated tracking updates, customer-safe tracking URL | Carrier sandbox responses and webhook replay tests |
| E-invoice / e-dispatch | Licensed integrator contract, tax identity and invoice type mapping, document numbers, error/retry flow | Integrator sandbox validation |
| Returns | Permission-controlled cancellation/refund, partial refund idempotency, stock disposition | Accounting and inventory reconciliation tests |
| Security | Customer authorization boundaries, staff role restrictions, rate limits, secret handling, audit logs | Security review and negative tests |
| Deployment | Green CI, backup/rollback procedure, smoke tests, verified source SHA | Signed release checklist |

## Confirmed in this branch

- Checkout unit tests exercise bank-transfer order shape, VAT/ledger/history, stock rejection, duplicate lines, invalid email, corporate invoice requirements, catalog misses and transaction failure without notification.
- Prior PR228 tests exercise read-only load and a rollback-only synthetic PostgreSQL transaction in an internal Docker network.

## Known limitations to resolve before launch

- Existing checkout checks available stock before the order transaction; this is **not an atomic reservation** and does not establish safety under concurrent checkout. Do not claim oversell protection until the stock lifecycle is reviewed across WMS and payment flows.
- Mocked unit tests and rollback-only probes do **not** prove a successful end-to-end bank confirmation, card payment, carrier booking, e-invoice, or actual refund.
- Provider integrations require real provider documentation, contracts, test credentials and approved callback URLs. Never fabricate credentials or silently enable real payments.
- No production migration, merge, deploy or payment operation should be initiated by this draft PR without explicit review.
