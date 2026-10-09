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
- Checkout now treats a post-commit notification webhook failure as a logged non-fatal error, preventing a committed order from being presented as failed. This is **not** a durable notification retry queue; delivery can still be missed.
- Prior PR228 tests exercise read-only load and a rollback-only synthetic PostgreSQL transaction in an internal Docker network.

## Known limitations to resolve before launch

- Existing checkout checks available stock before the order transaction; this is **not an atomic reservation** and does not establish safety under concurrent checkout. Do not claim oversell protection until the stock lifecycle is reviewed across WMS and payment flows.
- Mocked unit tests and rollback-only probes do **not** prove a successful end-to-end bank confirmation, card payment, carrier booking, e-invoice, or actual refund.
- Provider integrations require real provider documentation, contracts, test credentials and approved callback URLs. Never fabricate credentials or silently enable real payments.
- No production migration, merge, deploy or payment operation should be initiated by this draft PR without explicit review.


## Critical checkout reservation decision (2026-10-09)

Code inspection confirms `EcommerceCheckoutService.createOrder` currently checks `Product.stock - Product.reservedStock` **before** the database transaction, but does not reserve stock inside the transaction. Two concurrent requests may both pass the same stock check. This is a **release blocker** for oversell prevention, not solved by the synthetic unit tests.

Implementation must reconcile WMS reservation ownership and lifecycle first: order approval, cancellation, picking, shortages, returns, and warehouse stock ledgers. An isolated atomic `reservedStock` increment without release/consumption and warehouse consistency can strand inventory and cause operational discrepancies. Acceptance requires concurrent PostgreSQL integration tests with competing checkout requests, exactly-once reservation, rollback on failure, and full cancellation/fulfilment release tests. No production stock mutation is authorized as part of this draft PR.

## Existing schema compatibility audit

The current Prisma schema already includes `Order.stockReserved`, `Order.stockDeducted`, `Order.stockReservedAt`, `Order.stockDeductedAt`, `PaymentTransaction`, `PaymentGatewaySetting`, `CargoTrackingEvent`, `EcommerceReturn` and `EcommerceReturnItem`. Implementations must use and reconcile these models rather than creating parallel payment, tracking, return or reservation records.

The checkout path currently writes `Order.status=PENDING`, `paymentMethod=BANK_TRANSFER` and `paymentStatus=PENDING`. Do not treat an order-level pending payment as captured funds or authorize picking on this signal alone. Any reservation change must verify existing WMS reservation ownership and update `stockReserved` / `stockDeducted` consistently across approval, cancellation, fulfilment and returns.

Before activating a real gateway, require provider-specific signature verification, callback idempotency, amount and currency matching, and finance reconciliation. Before enabling carrier or e-document automation, require authenticated callbacks and provider sandbox receipts. Configuration without provider credentials must remain disabled, never silently mark payments, labels or documents as successful.

## Single-pass completion plan and handoff

**Definition of done:** A green mocked CI pipeline is necessary but insufficient. The PR remains draft until every mandatory gate above has evidence attached and a reviewer approves release. Work on this branch must not deploy to production.

### Implementation order (dependency-aware)

1. **Inventory ownership audit:** locate all WMS writes to `Product.reservedStock` and `Order.stockReserved/stockDeducted`. Document reservation creation, picking consumption, cancellation release and return disposition. Implement checkout with atomic conditional allocation inside the same transaction as order creation, using consistent lock ordering for multi-item carts. Add isolated PostgreSQL concurrency/rollback tests. Do not enable it until the WMS ownership model is verified.
2. **Payment state machine:** bank transfer must remain unpaid until an authorized staff confirmation backed by a bank reconciliation reference. Protect against duplicate confirmation and refunds; persist ledger credits and audit history transactionally. Virtual POS needs a sandbox-only adapter, signed callback verification, replay prevention, amount/currency matching and idempotent settlement. Reject unsigned callbacks.
3. **Fulfilment gate:** do not release unpaid orders for picking/shipping. Couple confirmed payment, reserved stock, WMS picking, deduction and shipping to explicit state transitions; reconcile short-picks and cancellations.
4. **Cargo and e-documents:** use existing tracking models and provider-specific signed webhook handlers, deduplication and authenticated customer tracking. Use a contracted e-invoice/e-dispatch integrator and persist external document references, errors and retry state. Never report a document as issued without a provider acknowledgment.
5. **Returns/refunds:** implement authorized, idempotent partial/full refunds linked to original captured payment, finance ledger and return inspection. Only restock approved sellable units, without double credit.
6. **Release verification:** integration and negative security tests, migration dry-run, provider sandbox receipts, reconciliation/UAT, rollback and backup evidence, then separate explicit merge/deploy approval.

### External dependencies (cannot be inferred from repository)

- Bank account details and approved reconciliation/confirmation workflow.
- Contracted POS provider and its sandbox credentials, signing specification, merchant identity and callback domains.
- Contracted cargo carrier(s), label API and webhook credentials.
- Licensed e-invoice/e-dispatch integrator, sandbox keys and taxpayer/e-document configuration.
- Authorized finance and warehouse acceptance sign-off.

**Do not fabricate provider success, customer funds, stock movements, invoice numbers or cargo labels.** The absence of credentials is a blocked integration, not a successful implementation.

### PR229 status as of this revision

Implemented: checkout validation for unsafe identifiers/quantities, invoice type, catalog/total validity and nonzero total; post-commit notification failures no longer cause checkout failure; notification webhook enforces HTTPS and rejects redirects; synthetic tests. Not implemented/verified: atomic reservation lifecycle, bank reconciliation, real POS 3DS/callbacks, carrier label/tracking integration, e-documents, refunds and full PostgreSQL integration/UAT. Keep PR **draft**.
