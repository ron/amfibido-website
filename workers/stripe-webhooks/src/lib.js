export const DEFAULT_SUPPLIER_WEBHOOK_URL =
	'https://kapiteinspel.nl/api/affiliate/amfibido/conversion';

export const KAPITEINSPEL_CLIENT_REFERENCE_PREFIX = 'ks-';

export const HANDLED_STRIPE_EVENTS = new Set([
	'checkout.session.completed',
	'checkout.session.async_payment_succeeded',
]);

/**
 * @param {string | null | undefined} clientReferenceId
 * @param {string} [prefix=KAPITEINSPEL_CLIENT_REFERENCE_PREFIX]
 */
export function isKapiteinspelOrder(clientReferenceId, prefix = KAPITEINSPEL_CLIENT_REFERENCE_PREFIX) {
	return Boolean(clientReferenceId && clientReferenceId.startsWith(prefix));
}

/**
 * @param {string | null | undefined} paymentStatus
 */
export function isPaidCheckoutSession(paymentStatus) {
	return paymentStatus === 'paid';
}

/**
 * @param {{ id: string }} event
 * @param {Record<string, unknown>} session
 */
export function buildKapiteinspelPayload(event, session) {
	const clientReferenceId = /** @type {string | undefined} */ (session.client_reference_id);

	/** @type {Record<string, unknown>} */
	const payload = {
		event_id: event.id,
		client_reference_id: clientReferenceId,
		amount_total: session.amount_total,
		paid: session.payment_status === 'paid',
	};

	const totalDetails = /** @type {Record<string, unknown> | null | undefined} */ (
		session.total_details
	);

	if (totalDetails?.amount_shipping != null) {
		payload.amount_shipping = totalDetails.amount_shipping;
	}
	if (totalDetails?.amount_tax != null) {
		payload.amount_tax = totalDetails.amount_tax;
	}
	if (session.currency) {
		payload.currency = session.currency;
	}
	if (session.id) {
		payload.session_id = session.id;
	}

	return payload;
}

/**
 * @param {string} message
 * @param {string} secret
 */
export async function hmacSha256Hex(message, secret) {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * @param {Record<string, unknown>} payload
 * @param {number} timestamp
 * @param {string | undefined} secret
 */
export async function buildKapiteinspelHeaders(payload, timestamp, secret) {
	const body = JSON.stringify(payload);
	/** @type {Record<string, string>} */
	const headers = {
		'Content-Type': 'application/json',
	};

	if (secret) {
		const signature = await hmacSha256Hex(`${timestamp}.${body}`, secret);
		headers['X-KS-Timestamp'] = String(timestamp);
		headers['X-KS-Signature'] = signature;
	}

	return { body, headers };
}

/**
 * @param {string} header
 */
export function parseStripeSignatureHeader(header) {
	/** @type {string | undefined} */
	let timestamp;
	/** @type {string | undefined} */
	let signature;

	for (const part of header.split(',')) {
		const [key, value] = part.split('=');
		if (key === 't') timestamp = value;
		if (key === 'v1') signature = value;
	}

	return { timestamp, signature };
}

/**
 * @param {string} secret
 */
function decodeWebhookSecret(secret) {
	const encoded = secret.replace(/^whsec_/, '');
	const binary = atob(encoded);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * @param {string} message
 * @param {Uint8Array} keyBytes
 */
async function hmacSha256HexWithKey(message, keyBytes) {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		keyBytes,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * @param {string} a
 * @param {string} b
 */
function timingSafeEqualHex(a, b) {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i += 1) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

/**
 * @param {string} body
 * @param {string | null} signatureHeader
 * @param {string[]} secrets
 * @param {number} [toleranceSeconds=300]
 */
export async function verifyStripeWebhook(
	body,
	signatureHeader,
	secrets,
	toleranceSeconds = 300
) {
	if (!signatureHeader) return null;

	const { timestamp, signature } = parseStripeSignatureHeader(signatureHeader);
	if (!timestamp || !signature) return null;

	const ts = Number.parseInt(timestamp, 10);
	if (!Number.isFinite(ts)) return null;

	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - ts) > toleranceSeconds) return null;

	const signedPayload = `${timestamp}.${body}`;

	for (const secret of secrets) {
		if (!secret) continue;
		try {
			const keyBytes = decodeWebhookSecret(secret);
			const expected = await hmacSha256HexWithKey(signedPayload, keyBytes);
			if (timingSafeEqualHex(signature, expected)) {
				return JSON.parse(body);
			}
		} catch {
			// try next secret
		}
	}

	return null;
}
