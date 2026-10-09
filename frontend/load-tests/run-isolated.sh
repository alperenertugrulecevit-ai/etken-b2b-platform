#!/usr/bin/env bash
set -Eeuo pipefail

# Local Docker-only test. No production credentials or network exposure.
cd "$(dirname "$0")/.."
USERS="${USERS:-10}"
case "$USERS" in 10|25|50|100) ;; *) echo "USERS must be 10, 25, 50 or 100" >&2; exit 2;; esac
if [[ -n "${DATABASE_URL:-}" || -n "${DIRECT_URL:-}" ]]; then
  echo "Refusing to run with inherited database credentials." >&2; exit 2
fi
for cmd in docker openssl; do command -v "$cmd" >/dev/null || { echo "$cmd required" >&2; exit 2; }; done
ID="etken-lt-$$"
NET="$ID-net"
DB="$ID-db"
IMAGE="$ID-app-image"
PASS="$(openssl rand -hex 24)"
DB_URL="postgresql://etken_test:${PASS}@${DB}:5432/etken_loadtest"
cleanup() {
  docker rm -f etken-loadtest-app "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
if docker container inspect etken-loadtest-app >/dev/null 2>&1; then
  echo "A test app with reserved name already exists; refusing to interfere." >&2; exit 2
fi

trap cleanup EXIT

echo "Building app image (no database secrets passed to build)..."
docker build -t "$IMAGE" .
docker network create --internal "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  --tmpfs /var/lib/postgresql/data:rw,size=2g \
  -e POSTGRES_USER=etken_test -e POSTGRES_PASSWORD="$PASS" \
  -e POSTGRES_DB=etken_loadtest postgres:17 >/dev/null

echo "Waiting for isolated PostgreSQL..."
for i in $(seq 1 45); do
  if docker exec "$DB" pg_isready -U etken_test -d etken_loadtest >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec "$DB" pg_isready -U etken_test -d etken_loadtest >/dev/null

echo "Applying migrations ONLY to the isolated database..."
docker run --rm --network "$NET" \
  -e DATABASE_URL="$DB_URL" -e DIRECT_URL="$DB_URL" \
  "$IMAGE" ./node_modules/.bin/prisma migrate deploy

echo "Seeding synthetic products in ephemeral test DB..."
docker run --rm --network "$NET" \
  -v "$PWD/load-tests/seed-synthetic.cjs:/app/load-tests/seed-synthetic.cjs:ro" \
  -e DATABASE_URL="$DB_URL" -e DIRECT_URL="$DB_URL" \
  --entrypoint node "$IMAGE" /app/load-tests/seed-synthetic.cjs

echo "Starting isolated app (no cloud credentials or public ports)..."
docker run -d --name etken-loadtest-app --network "$NET" \
  -e DATABASE_URL="$DB_URL" -e DIRECT_URL="$DB_URL" \
  -e NODE_ENV=production "$IMAGE" >/dev/null

echo "Checking app readiness..."
ready=0
for i in $(seq 1 60); do
  if docker exec etken-loadtest-app node -e 'fetch("http://127.0.0.1:8080/api/health").then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))' >/dev/null 2>&1; then
    ready=1; break
  fi
  sleep 2
done
if [[ "$ready" != 1 ]]; then
  echo "Isolated app failed to become healthy; last logs:" >&2
  docker logs --tail 70 etken-loadtest-app >&2
  exit 1
fi

echo "Checking write-test guard refuses unsafe environments..."
if DATABASE_URL="postgresql://example:example@production.example:5432/etken" \
   DIRECT_URL="postgresql://example:example@production.example:5432/etken" \
   bash load-tests/guard-order-write.sh >/dev/null 2>&1; then
  echo "Unsafe production-like URL was accepted by order-write guard." >&2
  exit 1
fi
if DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL" \
   ECOMMERCE_EMAIL_WEBHOOK_URL="https://example.invalid/webhook" \
   bash load-tests/guard-order-write.sh >/dev/null 2>&1; then
  echo "Order-write guard accepted configured outbound email." >&2
  exit 1
fi
if DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL" \
   STRIPE_SECRET_KEY="unsafe-test-key" \
   bash load-tests/guard-order-write.sh >/dev/null 2>&1; then
  echo "Order-write guard accepted payment credentials." >&2
  exit 1
fi
DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL" bash load-tests/guard-order-write.sh

echo "Checking read-only database baseline..."
baseline_products="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc "SELECT count(*) FROM \"Product\" WHERE code LIKE 'LT-PRODUCT-%';")"
baseline_orders="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc 'SELECT count(*) FROM "Order";')"
baseline_customers="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc 'SELECT count(*) FROM "Customer";')"
if [[ "$baseline_products" != 250 || "$baseline_orders" != 0 || "$baseline_customers" != 0 ]]; then
  echo "Unexpected baseline: products=$baseline_products orders=$baseline_orders customers=$baseline_customers" >&2
  exit 1
fi

echo "Running $USERS VUs, 2 minutes, read-only..."
docker run --rm --network "$NET" \
  -v "$PWD/load-tests:/scripts:ro" \
  grafana/k6:latest run \
  -e BASE_URL=http://etken-loadtest-app:8080 \
  -e USERS="$USERS" /scripts/k6-read-only.js

echo "Asserting isolated database was not modified by read-only load..."
product_count="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc "SELECT count(*) FROM \"Product\" WHERE code LIKE 'LT-PRODUCT-%';")"
order_count="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc 'SELECT count(*) FROM "Order";')"
customer_count="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc 'SELECT count(*) FROM "Customer";')"
order_item_count="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc 'SELECT count(*) FROM "OrderItem";')"
ledger_count="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc 'SELECT count(*) FROM "CustomerAccountEntry";')"
history_count="$(docker exec "$DB" psql -U etken_test -d etken_loadtest -Atc 'SELECT count(*) FROM "OrderStatusHistory";')"
if [[ "$product_count" != 250 || "$order_count" != 0 || "$customer_count" != 0 || "$order_item_count" != 0 || "$ledger_count" != 0 || "$history_count" != 0 ]]; then
  echo "Read-only invariant failed: synthetic products=$product_count, orders=$order_count, customers=$customer_count" >&2
  exit 1
fi
echo "Read-only invariants passed: 250 synthetic products; zero orders, customers, order items, ledger entries and status history."
