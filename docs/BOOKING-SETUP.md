# Booking system deployment

The booking module uses **Cloudflare Pages Functions + D1**. It does not use Firebase and has no localStorage fallback.

## Configure D1
1. Create a D1 database named `kasuhanet-bookings` in Cloudflare (or run `npx wrangler d1 create kasuhanet-bookings`).
2. Apply the schema with `npx wrangler d1 migrations apply kasuhanet-bookings --remote`.
3. In Cloudflare Pages > project > Settings > Functions > D1 database bindings, add binding name **DB** and select that database.
4. Configure the same binding for local development before testing locally.

The D1 binding is deliberately configured in the Cloudflare environment. No fabricated database ID or credentials are committed.

## Protect admin routes (required)
1. Create a Cloudflare Access self-hosted application covering both `/admin/*` and `/api/admin/*`.
2. Add an allow policy for only the intended admin email address(es).
3. Set Pages environment variable `ADMIN_EMAILS` to the exact comma-separated email allowlist.
4. Verify unauthenticated requests to both admin APIs return 401. Do not expose an alternate unprotected hostname or origin.

Admin functions check the Cloudflare Access `Cf-Access-Authenticated-User-Email` identity header against `ADMIN_EMAILS`. This header is trusted only when Cloudflare Access is enforced on those paths.

## Demo data
After migration, run `npx wrangler d1 execute kasuhanet-bookings --remote --file=./scripts/seed-demo.sql`. The seed is idempotent, uses reserved `.example.test` email addresses and marks every sample record with `is_demo = 1`. Demo records are not real customer orders.

## Endpoints
- `POST /api/orders`: create a customer order; returns order ID and private tracking token.
- `GET /api/orders?id=ORDER_ID&token=TRACKING_TOKEN`: retrieve the order and status history.
- `GET /api/admin/orders`: Access-protected order list; supports `status` and `q` filters.
- `PATCH /api/admin/orders`: Access-protected status/admin-note update; status history is written in the same D1 batch.
- `GET /api/admin/maintenance`: Access-protected maintenance history.
- `POST /api/admin/maintenance`: Access-protected maintenance log creation.

The server validates package IDs and derives prices itself. Reuse the same `Idempotency-Key` for retries of one submission.

## Boundaries and acceptance checks
- This module records orders; it does **not** process or confirm Stripe/card/bank payments.
- D1 binding, Cloudflare Access and `ADMIN_EMAILS` are account-level setup steps and cannot be created by committing repository files.
- Confirm persistence by creating an order, changing its status, refreshing the admin page, then retrieving it with its tracking token.
- Keep demo records out of real sales reports by filtering `is_demo = 0`.
