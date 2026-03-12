const ALLOWED_ORIGINS = [
	'https://amfibido.com',
	'https://www.amfibido.com',
	'http://localhost:8080',
	'http://localhost:3000',
];

const RULES_URL = 'https://amfibido.com/context/rules.md';
const CARDS_URL = 'https://amfibido.com/context/cards.md';
const REMINDERS_URL = 'https://amfibido.com/context/reminders.md';

let cachedRules = null;
let cachedCards = null;
let cachedReminders = null;
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
	if (cachedRules && cachedCards && cachedReminders && (now - cacheTime) < CACHE_DURATION) {
		return { rules: cachedRules, cards: cachedCards, reminders: cachedReminders };
	}

	const [rules, cards, reminders] = await Promise.all([
		fetchWithCache(RULES_URL, cachedRules),
		fetchWithCache(CARDS_URL, cachedCards),
		fetchWithCache(REMINDERS_URL, cachedReminders),
	]);

	cachedRules = rules;
	cachedCards = cards;
	cachedReminders = reminders;
	cacheTime = now;

	return { rules, cards, reminders };
}

function buildSystemPrompt(rules, cards, reminders) {
	return `You are a friendly and helpful assistant for the Amfibido board game.
Your role is to answer questions about the game rules and cards clearly and concisely.
Do not answer questions that are not related to the game.
Also do not give strategy advice, focus on correct rulings only.
Your name is Mr. Minami, a frog karate Sensei.

## Important Reminders (prioritize these over other context)
${reminders}

## Game Rules
${rules}

## Card Reference
${cards}

Guidelines:
- Answer based on the rules, cards, and reminders above
- Prioritize information from the Reminders section when there might be confusion
- If something isn't covered, say you don't have that information
- Keep responses brief but complete, maximum 4 sentences
- Be friendly and helpful`;
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

export default {
	async fetch(request, env, ctx) {
		const corsHeaders = getCorsHeaders(request);

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
			const { message, history = [] } = await request.json();

			if (!message || typeof message !== 'string') {
				return new Response(JSON.stringify({ error: 'Message is required' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			const { rules, cards, reminders } = await getContext();
			const systemPrompt = buildSystemPrompt(rules, cards, reminders);

			const messages = [
				{ role: 'system', content: systemPrompt },
				...history.slice(-10),
				{ role: 'user', content: message },
			];

			const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
					'Content-Type': 'application/json',
					'HTTP-Referer': 'https://amfibido.com',
					'X-Title': 'Amfibido Rules Chat',
				},
				body: JSON.stringify({
					model: 'openrouter/free',
					messages,
					max_tokens: 1000,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('OpenRouter error:', response.status, errorText);
				return new Response(JSON.stringify({ error: 'Failed to get response from AI' }), {
					status: 502,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			const data = await response.json();
			const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

			return new Response(JSON.stringify({ reply }), {
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
