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
trap cleanup EXIT
if docker container inspect etken-loadtest-app >/dev/null 2>&1; then
  echo "A test app with reserved name already exists; refusing to interfere." >&2; exit 2
fi

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

echo "Starting isolated app (no cloud credentials or public ports)..."
docker run -d --name etken-loadtest-app --network "$NET" \
  -e DATABASE_URL="$DB_URL" -e DIRECT_URL="$DB_URL" \
  -e NODE_ENV=production "$IMAGE" >/dev/null

echo "Checking app readiness..."
ready=0
for i in $(seq 1 60); do
  if docker run --rm --network "$NET" --entrypoint wget busybox:1.36 \
    -q -O /dev/null http://etken-loadtest-app:8080/api/health 2>/dev/null; then
    ready=1; break
  fi
  sleep 2
done
if [[ "$ready" != 1 ]]; then
  echo "Isolated app failed to become healthy; last logs:" >&2
  docker logs --tail 70 etken-loadtest-app >&2
  exit 1
fi

echo "Running $USERS VUs, 2 minutes, read-only..."
docker run --rm --network "$NET" \
  -v "$PWD/load-tests:/scripts:ro" \
  grafana/k6:latest run \
  -e BASE_URL=http://etken-loadtest-app:8080 \
  -e USERS="$USERS" /scripts/k6-read-only.js
