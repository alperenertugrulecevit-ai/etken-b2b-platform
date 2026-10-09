# Bank transfer expiry rollout (24 hours)

The 24-hour expiry policy is approved. Automatic cancellation is **off** unless explicitly enabled.

## Preconditions
- Reconcile imported bank transactions and manually review ambiguous/unmatched transfers before enabling execution.
- Run Prisma migrations, CI tests, and an authenticated dry run.
- Ensure payment callbacks and WMS operations cannot race cancellation; review transaction-level locking before production enablement.
- Configure a random secret (at least 32 characters) as Cloud Run secret environment variable `BANK_TRANSFER_EXPIRY_CRON_SECRET`.
- Keep `BANK_TRANSFER_EXPIRY_ENABLED=false` during dry-run and acceptance testing.

## API
`POST /api/internal/cron/bank-transfer-expiry` with header `Authorization: Bearer <secret>` runs a dry-run (maximum 100 orders).
`POST /api/internal/cron/bank-transfer-expiry?execute=true` performs cancellation **only** when `BANK_TRANSFER_EXPIRY_ENABLED=true`.

HTTP 207 indicates partial errors; do not count it as full success. HTTP 401/409/500 are failures. Inspect Cloud Run logs.

## Scheduler
After successful staging and dry-run verification, configure Google Cloud Scheduler to POST the authenticated endpoint on an hourly cadence, e.g. `0 * * * *` in `Europe/Istanbul`. Use a protected secret header or an authenticated gateway. Do not place the secret in source control or in a shell history command.

**Caution:** The job is an hourly sweep: an eligible order is cancelled on the first successful run after its 24-hour deadline, not necessarily at the exact second of expiry.

## Refunds
Card refunds require provider-side evidence in `PaymentTransaction.refundedAmount` before `completeRefund` can mark a credit-card order refunded. The adapter contract alone does not implement a live provider refund. Provider selection, credentials, sandbox testing, callbacks, and reconciliation remain prerequisites for actual refunds.
