# Ecommerce bank-transfer payment expiry policy

Status: approved business rule, implementation pending.

- Applies only to ecommerce orders paid by bank transfer / EFT.
- Deadline: exactly 24 hours after the order creation timestamp (UTC instant).
- A payment is **not** considered late solely because a bank transaction is unmatched: reconcile incoming transfers first and allow manual review of uncertain matches.
- Only unpaid, unshipped orders with no active picking, packing, shipping or other WMS processing are eligible for automatic cancellation.
- Never release reserved stock by directly changing a stock flag. Use the established OrderCancellationService so inventory, cancellation and ledger updates remain consistent.
- Do not automatically cancel orders with PAID or REFUND_PENDING payment status.
- A job must be authenticated, bounded, idempotent, safe under concurrent runs and instrumented with counts and errors. Dry-run mode and tests are required before enabling mutations.
- A cancellation must not create a refund unless an actual payment is confirmed. Real card refunds require a provider adapter and provider-side confirmation.
- The 24-hour policy does **not** apply to corporate credit-term invoices or other payment methods.

**This document does not activate a scheduler.** Production scheduling must not be enabled until the implementation and its integration tests pass.
