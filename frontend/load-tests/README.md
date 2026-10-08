# Isolated Etken load-test harness

**Never point k6 at etkenofis.com or production Supabase.**

This test harness builds the current application image, creates a temporary internal-only Docker network, starts a PostgreSQL 17 database with an ephemeral filesystem, runs Prisma migrations against that database, starts the app with **only test database credentials**, checks /api/health, and then executes read-only k6 requests against /, /products and /api/health.

Requirements: Docker, OpenSSL, adequate disk/memory (temporary database tmpfs limited to 2 GiB), and network access **before** the isolated network is created to pull images and build the app. The test containers have no published ports and their internal Docker network has no external egress. The script refuses inherited DATABASE_URL/DIRECT_URL credentials and does not read local .env files directly. Ensure .dockerignore excludes .env and sensitive files; review before running.

Run from frontend: `bash load-tests/run-isolated.sh` (10 VUs, 2 minutes). After successful validation: `USERS=25 bash load-tests/run-isolated.sh`, then 50 and 100 as resources allow. These are virtual users, not authenticated shoppers. Results measure a local container, **not Cloud Run scaling**. They cannot establish production capacity. No live payments, shipping or write endpoints are exercised.

Expected limitations: empty DB may need synthetic catalog/tenant bootstrap data for /products; app startup bootstrap may fail due to migrations/schema conflicts; test fails closed rather than switching to production data. A staging environment with a separate persistent database is required before Cloud Run-specific capacity tests.

No migration, load test, or production deploy occurs just by merging these files.
