# Isolated Etken load-test harness

**Never point k6 at etkenofis.com, Cloud Run production, or production Supabase.**

The GitHub Actions matrix runs 10, 25, 50 and 100 virtual users for two minutes each. The runner builds the application image, creates an internal-only Docker network, starts PostgreSQL 17 on tmpfs, applies Prisma migrations, seeds 250 synthetic active products under the synthetic test tenant/company and starts an app without published ports. k6 is hard-coded to `http://etken-loadtest-app:8080`.

The read-only scenario visits `/`, `/products`, `/products?q=Synthetic`, `/products?category=Office`, `/cart`, `/checkout` and `/api/health`. It checks HTTP 200, global p95 under 2 seconds, under 1% errors, and per-endpoint p95 for catalog, cart and checkout. This is **server HTTP performance**, not a browser checkout or successful cart submission. The catalog query parameters may be applied client-side; an HTTP 200 does not prove filtering correctness.

## Safety

- Requires Docker and OpenSSL; no inherited `DATABASE_URL` or `DIRECT_URL`.
- The isolated Docker network has no external egress, and no container publishes a host port.
- Synthetic seed refuses database URLs not matching the ephemeral `etken-lt-<pid>-db:5432/etken_loadtest` pattern.
- Containers and network are cleaned on exit. Review `.dockerignore` before running to ensure no secret files enter the Docker build context.
- The application currently creates **real order, customer, address, ledger and status-history records** when `EcommerceCheckoutService.createOrder` is called. It also attempts an order notification. **Do not run a write-load test against this service until external notifications are stubbed, the target is verified to be ephemeral, and database invariants are asserted.**
- Never provide production email, payment-provider, shipping-provider or cloud credentials to this test.

## Running

From `frontend`: `bash load-tests/run-isolated.sh`. Set `USERS=25`, `50` or `100` to change load. These are unauthenticated virtual users. Local Docker performance does not establish Cloud Run autoscaling or production capacity.

## Next phase: synthetic order flow

1. Add an explicit test-only transaction harness that refuses any database other than the ephemeral Docker PostgreSQL instance.
2. Disable external notification and payment/shipping side effects **inside the isolated test process**; do not alter production behavior.
3. Generate unique synthetic customers and order items. Assert order totals, line items, status history, customer ledger and stock/reservation invariants after every test batch.
4. Test concurrency and rejection of insufficient stock, duplicate items and invalid addresses. Keep write tests separate from the existing read-only matrix.

Merging these files does not itself deploy, migrate or load-test production.
