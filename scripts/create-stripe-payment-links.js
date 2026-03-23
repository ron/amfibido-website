#!/usr/bin/env node

const Stripe = require('stripe');

// Add your Stripe secret key here
const STRIPE_SECRET_KEY = 'sk_live_YOUR_KEY_HERE';

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Products
const products = {
  game: 'prod_UCFF4eoaCb5Zc8',
  game_mats: 'prod_UCFGskPw2AWF1c',
  game_mats_dice: 'prod_UCFHrFToplhVJ3',
};

// Shipping rates per country
const shippingRates = {
  UK: 'shr_1TDqy1LFY2i8mW1Snl19OcFO',
  BE: 'shr_1TDqxELFY2i8mW1SCn8815X7',
  DE: 'shr_1TDqwcLFY2i8mW1S8PTE9cJS',
  NL: 'shr_1TDqrkLFY2i8mW1Svert69Db',
};

// Country codes for shipping restrictions
const countryCodes = {
  UK: 'GB',
  BE: 'BE',
  DE: 'DE',
  NL: 'NL',
};

// Product display names for reference
const productNames = {
  game: 'Game',
  game_mats: 'Game + Mats',
  game_mats_dice: 'Game + Mats + Dice',
};

async function getDefaultPrice(productId) {
  const product = await stripe.products.retrieve(productId);
  return product.default_price;
}

async function createPaymentLink(productKey, countryKey) {
  const productId = products[productKey];
  const shippingRateId = shippingRates[countryKey];
  const countryCode = countryCodes[countryKey];

  // Get the default price for this product
  const priceId = await getDefaultPrice(productId);

  if (!priceId) {
    throw new Error(`No default price found for product ${productId}`);
  }

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: priceId,
        quantity: 1,
        adjustable_quantity: {
          enabled: false,
        },
      },
    ],
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: [countryCode],
    },
    shipping_options: [
      {
        shipping_rate: shippingRateId,
      },
    ],
    automatic_tax: {
      enabled: true,
    },
    metadata: {
      product: productNames[productKey],
      country: countryKey,
    },
  });

  return paymentLink;
}

async function main() {
  console.log('Creating Stripe Payment Links...\n');

  const results = [];

  for (const productKey of Object.keys(products)) {
    for (const countryKey of Object.keys(shippingRates)) {
      try {
        console.log(`Creating: ${productNames[productKey]} - ${countryKey}...`);
        const link = await createPaymentLink(productKey, countryKey);

        const result = {
          product: productNames[productKey],
          country: countryKey,
          url: link.url,
          id: link.id,
        };

        results.push(result);
        console.log(`  ✓ ${link.url}\n`);
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}\n`);
      }
    }
  }

  // Print summary
  console.log('\n=== SUMMARY ===\n');
  console.log('Copy these links to your shop page:\n');

  for (const countryKey of Object.keys(shippingRates)) {
    console.log(`\n--- ${countryKey} ---`);
    const countryResults = results.filter(r => r.country === countryKey);
    for (const r of countryResults) {
      console.log(`${r.product}: ${r.url}`);
    }
  }

  // Also output as JSON for easy integration
  console.log('\n\n=== JSON OUTPUT ===\n');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
