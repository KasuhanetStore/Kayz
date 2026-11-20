# KasuhaNET AI Sales Assistant

## What this first release does

The existing website Inbox Chat remains the customer interface. When a visitor sends a text message, the Pages Function stores it in D1 and, if the Cloudflare Workers AI binding named `AI` is available, generates a short sales/support reply and stores it as an assistant message in the same chat. The existing polling widget displays that reply without changing the page layout.

If AI is unavailable or errors, the customer's message is still stored and the existing Telegram admin notification path continues. Attachments are not sent to the language model.

## Cloudflare setup

1. Open the Cloudflare dashboard and select the Pages project connected to `KasuhanetStore/Kayz`.
2. Open Settings, then Functions, then Workers AI bindings (the exact menu label may vary).
3. Add a Workers AI binding with variable name `AI`.
4. Save the binding and redeploy the Pages project.
5. Optionally add a Pages environment variable named `AI_MODEL` to override the default model identifier used by the function.

The existing D1 binding must remain named `DB`. Do not replace or rename the current D1 database or Telegram secrets.

## Behaviour and safety

- The assistant replies in the visitor's language (Malay or English).
- It may explain KasuhaNET's website and digital services and qualify a sales enquiry.
- It must not claim a payment, refund, deployment or fulfilment task has completed.
- It must not request passwords, OTPs or payment-card details.
- Payment confirmation must continue to come from verified payment-provider callbacks, never from chat text or screenshots.
- AI failure does not block the support inbox or Telegram notification.

## Not yet included

This is the first conversational sales-assistant milestone. Automated paid-order fulfilment is not activated by this change. The next milestone must connect verified Stripe/ToyyibPay payment events to an idempotent order queue, then add approved fulfilment actions, status tracking, QA and delivery. Never let a chat message trigger paid work.
