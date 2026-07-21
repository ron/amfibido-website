#!/usr/bin/env node

/**
 * Resolve Stripe Payment Link URLs to plink_... IDs.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node lookup-payment-link-id.js <url> [url...]
 *   STRIPE_SECRET_KEY=sk_test_... node lookup-payment-link-id.js <test-url>
 *
 * Or pass --test to use sk_test from STRIPE_SECRET_KEY_TEST env var.
 */

const Stripe = require('stripe');

const urls = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const useTest = process.argv.includes('--test');

const secretKey = useTest
	? process.env.STRIPE_SECRET_KEY_TEST
	: process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
	console.error(
		useTest
			? 'Set STRIPE_SECRET_KEY_TEST for --test mode'
			: 'Set STRIPE_SECRET_KEY (or use --test with STRIPE_SECRET_KEY_TEST)'
	);
	process.exit(1);
}

if (urls.length === 0) {
	console.error('Usage: node lookup-payment-link-id.js [--test] <payment-link-url> [url...]');
	process.exit(1);
}

function normalizeUrl(url) {
	return url.trim().replace(/\/$/, '');
}

async function main() {
	const stripe = new Stripe(secretKey);
	const targets = new Set(urls.map(normalizeUrl));
	const found = new Map();

	let startingAfter;
	do {
		const page = await stripe.paymentLinks.list({
			limit: 100,
			...(startingAfter ? { starting_after: startingAfter } : {}),
		});

		for (const link of page.data) {
			const normalized = normalizeUrl(link.url);
			if (targets.has(normalized)) {
				found.set(normalized, link.id);
			}
		}

		if (found.size === targets.size) break;
		if (!page.has_more) break;
		startingAfter = page.data[page.data.length - 1].id;
	} while (true);

	console.log('\nPayment link IDs:\n');
	for (const url of urls) {
		const normalized = normalizeUrl(url);
		const id = found.get(normalized);
		if (id) {
			console.log(`${url}`);
			console.log(`  → ${id}\n`);
		} else {
			console.log(`${url}`);
			console.log('  → NOT FOUND (check mode: live vs test, and that the URL is exact)\n');
		}
	}

	const ids = [...found.values()];
	if (ids.length > 0) {
		console.log('SUPPLIER_PAYMENT_LINK_IDS value (comma-separated):');
		console.log(ids.join(','));
	}

	const missing = urls.filter((url) => !found.has(normalizeUrl(url)));
	if (missing.length > 0) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
