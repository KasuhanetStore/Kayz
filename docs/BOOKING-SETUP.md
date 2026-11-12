# Booking system deployment

This repository uses **Cloudflare Pages Functions + D1** for persistent booking data. It does not use Firebase and does not silently fall back to browser storage.

## 1. Create and bind D1

1. Create a D1 database in the Cloudflare dashboard (or run `npx wrangler d1 create kasuhanet-bookings`).
2. Apply the schema: `npx wrangler d1 migrations apply kasuhanet-bookings --remote`.
3. In Cloudflare Pages > your project > Settings > Functions > D1 database bindings, add binding name **DB** and select the database.
4. For local development, configure the same `DB` binding in Wrangler and run migrations locally.

Do not commit a real database ID or credentials. The binding is intentionally configured in the Cloudflare environment so this repository does not contain a fake database identifier.

## 2. Admin security (required before exposing admin routes)

1. Create a Cloudflare Access self-hosted application covering both `/admin/*` and `/api/admin/*` on the site hostname.
2. Add an allow policy for the intended admin email addresses only.
3. Set the Pages environment variable `ADMIN_EMAILS` to the comma-separated exact email allowlist.
4. Verify unauthenticated requests to `/api/admin/orders` and `/api/admin/maintenance` return 401, and authenticated non-allowlisted users are also denied.

The functions use Cloudflare Access's `Cf-Access-Authenticated-User-Email` identity header. This header is trusted only when Cloudflare Access is actually enforced on the admin paths. Do not expose these endpoints through an unprotected alternate hostname or origin.

## 3. Apply schema and optional demo data

Apply migrations before testing. To insert demo records, run:

```sh
npx wrangler d1 execute kasuhanet-bookings --remote --file=./scripts/seed-demo.sql
```

The seed uses fixed demo IDs and `INSERT OR IGNORE`, so it can be safely re-run. All sample records use reserved `.example.test` email addresses and are marked `is_demo = 1`. They are not real customer orders.

## 4. API

- `POST /api/orders`: create a customer order. Returns an order ID and private tracking token.
- `GET /api/orders?id=ORDER_ID&token=TRACKING_TOKEN`: retrieve that order and its status history.
- `GET /api/admin/orders`: Access-protected order list with optional `status` and `q` filters.
- `PATCH /api/admin/orders`: Access-protected status and admin-note update; writes status history in the same D1 batch.
- `GET /api/admin/maintenance`: Access-protected maintenance history.
- `POST /api/admin/maintenance`: Access-protected maintenance log creation.

The public order endpoint validates package IDs and derives prices on the server. It does not accept a client-supplied price. Reuse the same `Idempotency-Key` for retries of one submission.

## 5. Important boundaries

- Payment confirmation is not implemented by this booking module. A booking being saved or marked Completed does not prove that Stripe or another payment provider has charged the customer.
- Demo data must be removed from operational reporting or filtered by `is_demo = 0`.
- D1 binding, Access application, and `ADMIN_EMAILS` are deployment configuration steps. The repository alone cannot create these Cloudflare account resources.
- Test persistence by creating an order, updating its status, refreshing the admin page, and retrieving the order with its tracking token.
