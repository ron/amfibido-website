import {
	buildKapiteinspelHeaders,
	buildKapiteinspelPayload,
	DEFAULT_SUPPLIER_WEBHOOK_URL,
	HANDLED_STRIPE_EVENTS,
	isKapiteinspelOrder,
	isPaidCheckoutSession,
	verifyStripeWebhook,
} from './lib.js';

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSupplierWebhookUrl(env) {
	return env.SUPPLIER_WEBHOOK_URL || DEFAULT_SUPPLIER_WEBHOOK_URL;
}

/**
 * @param {KVNamespace} kv
 * @param {string} eventId
 */
async function wasAlreadyProcessed(kv, eventId) {
	return (await kv.get(eventId)) !== null;
}

/**
 * @param {KVNamespace} kv
 * @param {string} eventId
 */
async function markProcessed(kv, eventId) {
	await kv.put(eventId, '1', { expirationTtl: IDEMPOTENCY_TTL_SECONDS });
}

/**
 * @param {Record<string, unknown>} event
 * @param {Record<string, unknown>} session
 * @param {Record<string, string | undefined>} env
 */
export async function forwardToKapiteinspel(event, session, env) {
	const payload = buildKapiteinspelPayload(event, session);
	const timestamp = Math.floor(Date.now() / 1000);
	const { body, headers } = await buildKapiteinspelHeaders(
		payload,
		timestamp,
		env.KAPITEINSPEL_SHARED_SECRET
	);

	const response = await fetch(getSupplierWebhookUrl(env), {
		method: 'POST',
		headers,
		body,
	});

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		throw new Error(
			`Kapiteinspel webhook failed (${response.status}): ${text.slice(0, 500)}`
		);
	}

	return payload;
}

function ignoredResponse(reason) {
	return new Response(JSON.stringify({ received: true, forwarded: false, reason }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {ExecutionContext} ctx
 */
async function handleWebhook(request, env, ctx) {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	const body = await request.text();
	const signature = request.headers.get('Stripe-Signature');
	const secrets = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_WEBHOOK_SECRET_TEST].filter(
		Boolean
	);

	if (secrets.length === 0) {
		console.error('No Stripe webhook secrets configured');
		return new Response('Webhook secrets not configured', { status: 500 });
	}

	const event = await verifyStripeWebhook(body, signature, secrets);
	if (!event) {
		return new Response('Invalid signature', { status: 400 });
	}

	if (!HANDLED_STRIPE_EVENTS.has(event.type)) {
		return new Response(JSON.stringify({ received: true, ignored: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const session = /** @type {Record<string, unknown>} */ (event.data.object);
	const clientReferenceId = /** @type {string | undefined} */ (session.client_reference_id);
	const paymentStatus = /** @type {string | undefined} */ (session.payment_status);

	if (!isKapiteinspelOrder(clientReferenceId)) {
		return ignoredResponse('not_kapiteinspel_order');
	}

	if (!isPaidCheckoutSession(paymentStatus)) {
		return ignoredResponse('payment_not_paid');
	}

	if (env.IDEMPOTENCY && (await wasAlreadyProcessed(env.IDEMPOTENCY, event.id))) {
		return ignoredResponse('already_processed');
	}

	try {
		const payload = await forwardToKapiteinspel(event, session, env);
		if (env.IDEMPOTENCY) {
			await markProcessed(env.IDEMPOTENCY, event.id);
		}
		return new Response(
			JSON.stringify({ received: true, forwarded: true, payload }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Failed to forward to Kapiteinspel:', error);
		return new Response(
			JSON.stringify({
				received: true,
				forwarded: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === '/webhook' || url.pathname === '/stripe/webhook') {
			return handleWebhook(request, env, ctx);
		}

		if (url.pathname === '/health') {
			return new Response('ok', { status: 200 });
		}

		return new Response('Not found', { status: 404 });
	},
};
