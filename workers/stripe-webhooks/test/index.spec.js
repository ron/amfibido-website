import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	buildKapiteinspelPayload,
	hmacSha256Hex,
	isKapiteinspelOrder,
	isPaidCheckoutSession,
	buildKapiteinspelHeaders,
	verifyStripeWebhook,
	parseStripeSignatureHeader,
} from '../src/lib.js';
import worker from '../src/index.js';

describe('lib', () => {
	it('isKapiteinspelOrder matches client_reference_id starting with ks-', () => {
		expect(isKapiteinspelOrder('ks-1234-ab12')).toBe(true);
		expect(isKapiteinspelOrder('ks-affiliate')).toBe(true);
		expect(isKapiteinspelOrder('amfibido-123')).toBe(false);
		expect(isKapiteinspelOrder(null)).toBe(false);
	});

	it('isPaidCheckoutSession only accepts paid', () => {
		expect(isPaidCheckoutSession('paid')).toBe(true);
		expect(isPaidCheckoutSession('unpaid')).toBe(false);
		expect(isPaidCheckoutSession(undefined)).toBe(false);
	});

	it('buildKapiteinspelPayload maps Stripe session fields', () => {
		const event = { id: 'evt_123' };
		const session = {
			id: 'cs_123',
			client_reference_id: 'ks-1234-ab12',
			amount_total: 5490,
			payment_status: 'paid',
			currency: 'eur',
			total_details: {
				amount_shipping: 495,
				amount_tax: 866,
			},
		};

		expect(buildKapiteinspelPayload(event, session)).toEqual({
			event_id: 'evt_123',
			client_reference_id: 'ks-1234-ab12',
			amount_total: 5490,
			amount_shipping: 495,
			amount_tax: 866,
			currency: 'eur',
			session_id: 'cs_123',
			paid: true,
		});
	});

	it('buildKapiteinspelPayload omits optional fields when absent', () => {
		const payload = buildKapiteinspelPayload(
			{ id: 'evt_1' },
			{
				client_reference_id: 'ks-test',
				amount_total: 1000,
				payment_status: 'unpaid',
			}
		);

		expect(payload).toEqual({
			event_id: 'evt_1',
			client_reference_id: 'ks-test',
			amount_total: 1000,
			paid: false,
		});
	});

	it('hmacSha256Hex produces stable hex output', async () => {
		const sig = await hmacSha256Hex('1700000000.{"paid":true}', 'test-secret');
		expect(sig).toMatch(/^[0-9a-f]{64}$/);
		expect(await hmacSha256Hex('1700000000.{"paid":true}', 'test-secret')).toBe(sig);
	});

	it('parseStripeSignatureHeader extracts timestamp and signature', () => {
		const parsed = parseStripeSignatureHeader('t=1700000000,v1=abc123');
		expect(parsed).toEqual({ timestamp: '1700000000', signature: 'abc123' });
	});

	it('verifyStripeWebhook accepts valid signatures', async () => {
		const event = { id: 'evt_1', type: 'checkout.session.completed' };
		const { body, signature } = signStripeEvent(event, TEST_WEBHOOK_SECRET);
		const verified = await verifyStripeWebhook(body, signature, [TEST_WEBHOOK_SECRET]);
		expect(verified).toEqual(event);
	});

	it('verifyStripeWebhook rejects invalid signatures', async () => {
		const verified = await verifyStripeWebhook('{}', 't=1,v1=bad', [TEST_WEBHOOK_SECRET]);
		expect(verified).toBeNull();
	});

	it('buildKapiteinspelHeaders signs timestamp and body when secret is set', async () => {
		const payload = {
			event_id: 'evt_1',
			client_reference_id: 'ks-1234-ab12',
			amount_total: 1000,
			paid: true,
		};
		const { body, headers } = await buildKapiteinspelHeaders(payload, 1700000000, 'secret');
		expect(body).toBe(JSON.stringify(payload));
		expect(headers['X-KS-Timestamp']).toBe('1700000000');
		expect(headers['X-KS-Signature']).toMatch(/^[0-9a-f]{64}$/);
	});

	it('buildKapiteinspelHeaders omits signature headers when secret is missing', async () => {
		const payload = {
			event_id: 'evt_1',
			client_reference_id: 'ks-1234-ab12',
			amount_total: 1000,
			paid: true,
		};
		const { body, headers } = await buildKapiteinspelHeaders(payload, 1700000000, undefined);
		expect(body).toBe(JSON.stringify(payload));
		expect(headers).toEqual({ 'Content-Type': 'application/json' });
	});
});

describe('stripe-webhooks worker', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('GET /health returns ok', async () => {
		const request = new Request('https://example.com/health');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, getTestEnv(), ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('ok');
	});

	it('POST /webhook without signature returns 400', async () => {
		const request = new Request('https://example.com/webhook', {
			method: 'POST',
			body: '{}',
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, getTestEnv(), ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});

	it('POST /webhook ignores own shop orders without ks- client_reference_id', async () => {
		const event = buildStripeEvent({ client_reference_id: 'amfibido-order-1' });
		const { body, signature } = signStripeEvent(event, TEST_WEBHOOK_SECRET);

		const request = new Request('https://example.com/webhook', {
			method: 'POST',
			headers: { 'Stripe-Signature': signature },
			body,
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, getTestEnv(), ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.forwarded).toBe(false);
		expect(data.reason).toBe('not_kapiteinspel_order');
	});

	it('POST /webhook ignores unpaid Kapiteinspel orders', async () => {
		const event = buildStripeEvent({
			client_reference_id: 'ks-1234-ab12',
			payment_status: 'unpaid',
		});
		const { body, signature } = signStripeEvent(event, TEST_WEBHOOK_SECRET);

		const request = new Request('https://example.com/webhook', {
			method: 'POST',
			headers: { 'Stripe-Signature': signature },
			body,
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, getTestEnv(), ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.forwarded).toBe(false);
		expect(data.reason).toBe('payment_not_paid');
	});

	it('POST /webhook forwards paid Kapiteinspel orders without signing when secret is missing', async () => {
		const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const event = buildStripeEvent({ client_reference_id: 'ks-1234-ab12' });
		const { body, signature } = signStripeEvent(event, TEST_WEBHOOK_SECRET);

		const request = new Request('https://example.com/webhook', {
			method: 'POST',
			headers: { 'Stripe-Signature': signature },
			body,
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, getTestEnv({ KAPITEINSPEL_SHARED_SECRET: undefined }), ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.forwarded).toBe(true);

		const [, options] = fetchMock.mock.calls[0];
		expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
		expect(options.headers['X-KS-Signature']).toBeUndefined();
	});

	it('POST /webhook forwards paid Kapiteinspel orders with signing when secret is set', async () => {
		const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const event = buildStripeEvent({ client_reference_id: 'ks-1234-ab12' });
		const { body, signature } = signStripeEvent(event, TEST_WEBHOOK_SECRET);

		const request = new Request('https://example.com/webhook', {
			method: 'POST',
			headers: { 'Stripe-Signature': signature },
			body,
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, getTestEnv(), ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.forwarded).toBe(true);
		expect(data.payload.client_reference_id).toBe('ks-1234-ab12');
		expect(fetchMock).toHaveBeenCalledOnce();

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe('https://kapiteinspel.nl/api/affiliate/amfibido/conversion');
		expect(options.method).toBe('POST');
		expect(options.headers['X-KS-Timestamp']).toBeTruthy();
		expect(options.headers['X-KS-Signature']).toMatch(/^[0-9a-f]{64}$/);
	});
});

const TEST_WEBHOOK_SECRET =
	'whsec_' + Buffer.from('test_signing_secret_12345').toString('base64');

function getTestEnv(overrides = {}) {
	return {
		STRIPE_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
		STRIPE_WEBHOOK_SECRET_TEST: undefined,
		KAPITEINSPEL_SHARED_SECRET: 'kapiteinspel-secret',
		SUPPLIER_WEBHOOK_URL: 'https://kapiteinspel.nl/api/affiliate/amfibido/conversion',
		IDEMPOTENCY: undefined,
		...overrides,
	};
}

function buildStripeEvent(overrides = {}) {
	return {
		id: 'evt_test_123',
		type: 'checkout.session.completed',
		data: {
			object: {
				id: 'cs_test_123',
				client_reference_id: 'ks-1234-ab12',
				amount_total: 5490,
				payment_status: 'paid',
				currency: 'eur',
				total_details: {
					amount_shipping: 495,
					amount_tax: 866,
				},
				...overrides,
			},
		},
	};
}

function signStripeEvent(event, secret) {
	const body = JSON.stringify(event);
	const timestamp = Math.floor(Date.now() / 1000);
	const signedPayload = `${timestamp}.${body}`;
	const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	const signature = require('node:crypto')
		.createHmac('sha256', key)
		.update(signedPayload, 'utf8')
		.digest('hex');

	return {
		body,
		signature: `t=${timestamp},v1=${signature}`,
	};
}
