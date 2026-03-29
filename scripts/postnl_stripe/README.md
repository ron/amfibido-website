# Stripe -> PostNL batch shipment (no webhooks)

This script:

- Fetches paid Stripe `checkout.sessions` that have **not** been processed yet
- Builds a PostNL Shipment V2_2 “label” request (supports multiple parcels per order)
- Calls PostNL to generate shipments + labels
- Writes the returned barcodes and label files to disk
- Marks the Stripe checkout session as processed via `checkout.session.metadata`

## Setup

1. Create `scripts/postnl_stripe/.env` from `.env.example`
2. Install gems:

   ```bash
   cd scripts/postnl_stripe
   bundle install
   ```

## Run

```bash
cd scripts/postnl_stripe
bundle exec ruby bin/process_open_shipments.rb
```

### Options

```bash
bundle exec ruby bin/process_open_shipments.rb --max-sessions 50 --dry-run
```

## Safety / idempotency

The script uses `STRIPE_POSTNL_METADATA_PROCESSED_KEY` (default `postnl_processed`) on the Stripe checkout session.
Only sessions where that metadata key is not set to `"true"` will be processed.

