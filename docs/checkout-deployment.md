# KasuhaNET checkout deployment checklist

This document covers only the D1 and Stripe checkout workflow. It does not change or migrate unrelated site content.

## Cloudflare Pages configuration

- D1 database binding: `DB` (bind the intended production database only when ready).
- Secret: `STRIPE_SECRET_KEY` (Stripe secret key for the same mode as the webhook).
- Secret: `STRIPE_WEBHOOK_SECRET` (signing secret for the webhook endpoint).
- Secret: `RESEND_API_KEY` (Resend API key used for admin notifications).
- Variable: `RESEND_FROM_EMAIL` (a sender address/domain verified in Resend).

Admin order notifications are sent to `kasuhaoculusorganisation@kasuhanet.store`. The buyer's email remains the customer email stored with the order and passed to Stripe.

If the Resend credentials are absent, checkout still creates the order and Stripe session, but admin email notifications are skipped. Configure and test Resend before relying on email alerts.

## D1 migration

Apply `migrations/0001_create_orders.sql` once to the D1 database bound as `DB`. Do not run against the wrong database. Verify the table and indexes exist before enabling production checkout.

## Stripe webhook

Configure the endpoint:

`https://kasuhanet.store/api/stripe-webhook`

Subscribe to:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Use the endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`. Never commit Stripe or Resend secrets.

## Verification before production

1. Use Stripe test-mode credentials and a non-production/test D1 database first.
2. Submit both BM and EN checkout forms for each package.
3. Confirm a pending order is created with the server-defined MYR amount.
4. Confirm the Stripe session ID is saved before redirecting the customer.
5. Complete a test payment and verify the webhook changes only the matching order to `paid`.
6. Send a test webhook with a mismatched session ID, amount, currency, or signature; it must not mark an order paid.
7. Replay the same event and confirm the order remains paid and the email provider's idempotency key prevents duplicate notification.
8. Verify BM checkout returns to the BM page and EN checkout returns to the EN page.
9. Verify the admin inbox receives pending and final payment status notifications.

Do not treat the workflow as production-ready until these checks pass and the Cloudflare/Stripe/Resend settings are confirmed.
