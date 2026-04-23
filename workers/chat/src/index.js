const ALLOWED_ORIGINS = [
	'https://amfibido.com',
	'https://www.amfibido.com',
	'http://localhost:8080',
	'http://localhost:3000',
];

const RULES_URL = 'https://amfibido.com/context/rules.md';
const CARDS_URL = 'https://amfibido.com/context/cards.md';
const REMINDERS_URL = 'https://amfibido.com/context/reminders.md';
const PRODUCT_URL = 'https://amfibido.com/context/product.md';

const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini';

/** If context/product.md is not yet deployed, still answer common product questions. */
const DEFAULT_PRODUCT_CONTEXT = `## Direct answers (use plain wording only)
- **Is the art AI?** **Yes.** Amfibido includes AI-generated art, as well as art from other sources.`;

let cachedRules = null;
let cachedCards = null;
let cachedReminders = null;
let cachedProduct = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function fetchWithCache(url, cached) {
	try {
		const response = await fetch(url);
		if (response.ok) {
			return await response.text();
		}
	} catch (error) {
		console.error(`Failed to fetch ${url}:`, error);
	}
	return cached || '';
}

async function getContext() {
	const now = Date.now();
	if (
		cachedRules &&
		cachedCards &&
		cachedReminders &&
		cachedProduct != null &&
		now - cacheTime < CACHE_DURATION
	) {
		return { rules: cachedRules, cards: cachedCards, reminders: cachedReminders, product: cachedProduct };
	}

	const [rules, cards, reminders, product] = await Promise.all([
		fetchWithCache(RULES_URL, cachedRules),
		fetchWithCache(CARDS_URL, cachedCards),
		fetchWithCache(REMINDERS_URL, cachedReminders),
		fetchWithCache(PRODUCT_URL, cachedProduct),
	]);

	cachedRules = rules;
	cachedCards = cards;
	cachedReminders = reminders;
	cachedProduct = product;
	cacheTime = now;

	return { rules, cards, reminders, product };
}

function buildSystemPrompt(rules, cards, reminders, product) {
	const productText = (product && product.trim()) || DEFAULT_PRODUCT_CONTEXT;
	return `You are a friendly, concise assistant for the Amfibido board game.
Your job is to give correct **rules and card text** (rulings), not strategy, hype, or filler.
Your name is Mr. Minami, a frog karate Sensei.

## Amfibido product and publishing
For questions about AI/art, publishing, or the product (not gameplay rules), use **only** the text below.
- Answer in **1–2 short sentences**. If a yes/no is enough, start with **Yes** or **No** then at most one more sentence.
- **Do not** add filler: no talk of algorithms, "automated processes", efficiency, "design execution", consistency, style systems, or similar. Do not "sell" the game—state the facts from this block only.
- If the answer is not in this block, say you do not have that and they can use ron@amfibido.com.
${productText}

## Important Reminders (prioritize these over other context)
${reminders}

## Game Rules
${rules}

## Card Reference
${cards}

Guidelines:
- Base answers on the rules, card reference, and reminders. Prefer **Reminders** when something could be confused.
- If a user message is **ambiguous** (unclear which card, step, or situation), do **not** guess: reply with **exactly one** short clarifying question, then wait (no answer to the main question yet).
- **No filler or flavor** unless it restates a rule or a product fact verbatim. Banned: motivational language, "strategic" advice, generic combo talk, closings like "all clear" / "game flow", and **buzzword product talk** (efficiency, algorithms, automated processes, design execution, etc.). For product questions, restate the fact simply—never pad with *how* AI is used.
- If something is not in the context above, say you do not have that information. For edge cases, users can email ron@amfibido.com (include the exact text ron@amfibido.com when pointing them there).
- For questions outside Amfibido rules, cards, reminders, and the product block above, decline in one short sentence and offer ron@amfibido.com.
- Cite the relevant piece when useful (e.g. "Per the FAQ on combo moves and replacing…" or "The Spawn card says…").
- Keep normal answers brief: at most **4 sentences** (rules questions) after any single clarifying question.
- **Do not** give strategy (what to do to win); only what the rules allow or require.`;
}

function getCorsHeaders(request) {
	const origin = request.headers.get('Origin');
	const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
}

/** Client IP as seen by Cloudflare (or first X-Forwarded-For hop). */
function getClientIp(request) {
	return (
		request.headers.get('CF-Connecting-IP') ||
		request.headers.get('True-Client-IP') ||
		(request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
		'unknown'
	);
}

async function logConversation(db, conversationId, origin, clientIp, userMessage, assistantReply) {
	try {
		await db.batch([
			db.prepare(`
				INSERT INTO conversations (id, origin, client_ip)
				VALUES (?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					updated_at = datetime('now'),
					client_ip = excluded.client_ip
			`).bind(conversationId, origin, clientIp),
			db.prepare(`
				INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)
			`).bind(conversationId, userMessage),
			db.prepare(`
				INSERT INTO messages (conversation_id, role, content) VALUES (?, 'assistant', ?)
			`).bind(conversationId, assistantReply),
		]);
	} catch (error) {
		console.error('Failed to log conversation:', error);
	}
}

async function sendConversationEmail(env, conversation, messages) {
	const formattedMessages = messages.map(m => {
		const role = m.role === 'user' ? '👤 User' : '🐸 Mr. Minami';
		return `${role}:\n${m.content}`;
	}).join('\n\n---\n\n');

	const ipLine = conversation.client_ip ? `Client IP: ${conversation.client_ip}` : 'Client IP: (not recorded)';

	const emailBody = `
New conversation from ${conversation.origin}
${ipLine}
Started: ${conversation.created_at}
Conversation ID: ${conversation.id}

${'='.repeat(50)}

${formattedMessages}
`;

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: 'Mr. Minami <minami@amfibido.com>',
			to: 'ron@amfibido.com',
			subject: `Amfibido Chat: ${messages[0]?.content?.slice(0, 50) || 'New conversation'}...`,
			text: emailBody,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Resend error: ${error}`);
	}

	return response.json();
}

async function processUnsentConversations(env) {
	const { results: conversations } = await env.DB.prepare(`
		SELECT * FROM conversations
		WHERE emailed_at IS NULL
		AND created_at <= datetime('now', '-15 minutes')
	`).all();

	console.log(`Found ${conversations.length} conversations to email`);

	for (const conversation of conversations) {
		try {
			const { results: messages } = await env.DB.prepare(`
				SELECT role, content, created_at
				FROM messages
				WHERE conversation_id = ?
				ORDER BY created_at ASC
			`).bind(conversation.id).all();

			if (messages.length === 0) continue;

			await sendConversationEmail(env, conversation, messages);

			await env.DB.prepare(`
				UPDATE conversations SET emailed_at = datetime('now') WHERE id = ?
			`).bind(conversation.id).run();

			console.log(`Emailed conversation ${conversation.id}`);
		} catch (error) {
			console.error(`Failed to email conversation ${conversation.id}:`, error);
		}
	}
}

/** @returns {Promise<{ ok: boolean, text: string | null }>} */
async function openRouterChatCompletion(env, body) {
	const model = env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
	const requestBody = { ...body, model };

	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'https://amfibido.com',
			'X-Title': 'Amfibido Rules Chat',
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error('OpenRouter error:', response.status, errorText);
		return { ok: false, text: null };
	}

	const data = await response.json();
	const text = (data.choices?.[0]?.message?.content || '').trim();
	if (!text) {
		console.warn('OpenRouter returned empty content', { model: data.model || model });
	}
	return { ok: true, text: text || null };
}

export default {
	async scheduled(event, env, ctx) {
		ctx.waitUntil(processUnsentConversations(env));
	},

	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const corsHeaders = getCorsHeaders(request);

		if (url.pathname === '/test-email') {
			try {
				const { results: conversations } = await env.DB.prepare(`
					SELECT * FROM conversations
					WHERE emailed_at IS NULL
					AND created_at <= datetime('now', '-15 minutes')
				`).all();

				const results = [];
				for (const conversation of conversations) {
					try {
						const { results: messages } = await env.DB.prepare(`
							SELECT role, content, created_at
							FROM messages
							WHERE conversation_id = ?
							ORDER BY created_at ASC
						`).bind(conversation.id).all();

						if (messages.length === 0) {
							results.push({ id: conversation.id, status: 'skipped', reason: 'no messages' });
							continue;
						}

						await sendConversationEmail(env, conversation, messages);

						await env.DB.prepare(`
							UPDATE conversations SET emailed_at = datetime('now') WHERE id = ?
						`).bind(conversation.id).run();

						results.push({ id: conversation.id, status: 'sent' });
					} catch (error) {
						results.push({ id: conversation.id, status: 'error', error: error.message });
					}
				}

				return new Response(JSON.stringify({
					found: conversations.length,
					results
				}), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		if (request.method !== 'POST') {
			return new Response(JSON.stringify({ error: 'Method not allowed' }), {
				status: 405,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		try {
			const body = await request.json();
			const message = body.message;
			const history = body.history || [];
			const conversationId = body.conversationId || crypto.randomUUID();

			if (!message || typeof message !== 'string') {
				return new Response(JSON.stringify({ error: 'Message is required' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			const { rules, cards, reminders, product } = await getContext();
			const systemPrompt = buildSystemPrompt(rules, cards, reminders, product);

			const messages = [
				{ role: 'system', content: systemPrompt },
				...history.slice(-10),
				{ role: 'user', content: message },
			];

			const completionBody = {
				messages,
				max_tokens: 1000,
				temperature: 0,
			};

			let { ok, text: reply } = await openRouterChatCompletion(env, completionBody);
			if (!ok) {
				return new Response(JSON.stringify({ error: 'Failed to get response from AI' }), {
					status: 502,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			if (reply == null || reply === '') {
				const second = await openRouterChatCompletion(env, completionBody);
				reply =
					second.ok && second.text
						? second.text
						: "Sorry, I couldn't generate a response.";
			}

			const origin = request.headers.get('Origin') || 'unknown';
			const clientIp = getClientIp(request);
			ctx.waitUntil(logConversation(env.DB, conversationId, origin, clientIp, message, reply));

			return new Response(JSON.stringify({ reply, conversationId }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('Worker error:', error);
			return new Response(JSON.stringify({ error: 'Internal server error' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
