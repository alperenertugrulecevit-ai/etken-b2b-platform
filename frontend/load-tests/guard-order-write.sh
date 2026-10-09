#!/usr/bin/env bash
set -Eeuo pipefail

# Write-test prerequisite: prove the DB is disposable and contains only synthetic records.
# This script NEVER creates an order; it is a mandatory guard for a future order-flow test.
if [[ -z "${DATABASE_URL:-}" || -z "${DIRECT_URL:-}" || "${DATABASE_URL}" != "${DIRECT_URL}" ]]; then
  echo "Refusing: matching explicit disposable DATABASE_URL and DIRECT_URL are required." >&2
  exit 2
fi
if [[ ! "${DATABASE_URL}" =~ ^postgresql://etken_test:[a-f0-9]{48}@etken-lt-[0-9]+-db:5432/etken_loadtest$ ]]; then
  echo "Refusing: only ephemeral Etken Docker PostgreSQL is permitted." >&2
  exit 2
fi
if [[ -n "${ECOMMERCE_EMAIL_WEBHOOK_URL:-}" || -n "${ECOMMERCE_EMAIL_WEBHOOK_TOKEN:-}" ]]; then
  echo "Refusing: email webhook configuration is not allowed in isolated write tests." >&2
  exit 2
fi
if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" || -n "${GOOGLE_CLOUD_PROJECT:-}" || -n "${GOOGLE_CLOUD_PROJECT_ID:-}" ]]; then
  echo "Refusing: cloud credentials/project variables are not allowed." >&2
  exit 2
fi
if [[ -n "${SMTP_HOST:-}" || -n "${SMTP_PASSWORD:-}" || -n "${RESEND_API_KEY:-}" || -n "${STRIPE_SECRET_KEY:-}" || -n "${IYZICO_API_KEY:-}" || -n "${PAYTR_MERCHANT_KEY:-}" ]]; then
  echo "Refusing: external email/payment credentials are not allowed." >&2
  exit 2
fi
echo "Ephemeral database URL and side-effect environment guard passed."
