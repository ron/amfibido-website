# Stripe Webhook Forwarder (Cloudflare Worker)

Receives Stripe checkout webhooks and forwards Kapiteinspel affiliate conversions only.

## Filtering (Kapiteinspel spec)

For `checkout.session.completed` and `checkout.session.async_payment_succeeded`:

1. `client_reference_id` must start with `ks-` — otherwise ignored (your own shop sales)
2. `payment_status` must be `paid` — ignores delayed payment methods until money arrives

## Kapiteinspel endpoint

```
POST https://kapiteinspel.nl/api/affiliate/amfibido/conversion
```

### Outbound headers

- `X-KS-Timestamp`: Unix seconds
- `X-KS-Signature`: Hex HMAC-SHA256 of `"<timestamp>.<body>"` using `KAPITEINSPEL_SHARED_SECRET` (only when secret is configured)

### Outbound body

```json
{
  "event_id": "evt_...",
  "client_reference_id": "ks-1234-ab12",
  "amount_total": 5490,
  "amount_shipping": 495,
  "amount_tax": 866,
  "currency": "eur",
  "session_id": "cs_...",
  "paid": true
}
```

`client_reference_id` comes from the Stripe checkout session (must start with `ks-`).

Kapiteinspel responses: `200` ok, `422` missing fields, `400` bad signature.

## Setup

### 1. Install dependencies

```bash
cd workers/stripe-webhooks
npm install
```

### 2. Set secrets

```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET          # Live webhook signing secret
npx wrangler secret put STRIPE_WEBHOOK_SECRET_TEST     # Test webhook signing secret
npx wrangler secret put KAPITEINSPEL_SHARED_SECRET     # Optional; adds X-KS-Signature when set
npx wrangler secret put SUPPLIER_WEBHOOK_URL           # Optional; defaults to Kapiteinspel URL
```

### 3. Deploy

```bash
npm run deploy
```

Worker URL: `https://stripe-webhooks.amfibido.workers.dev/webhook`

### 4. Register Stripe webhooks

In Stripe Dashboard → Developers → Webhooks, add an endpoint **in both Live and Test mode**:

- URL: `https://stripe-webhooks.amfibido.workers.dev/webhook`
- Events:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`

## Local development

Copy `.dev.vars.example` to `.dev.vars` and fill in secrets.

```bash
npm run dev
```

## Tests

```bash
npm test
```

## Health check

```
GET /health → 200 ok
```
