const ALLOWED_ORIGINS = [
	'https://amfibido.com',
	'https://www.amfibido.com',
	'http://localhost:8080',
	'http://localhost:3000',
];

const RULES_URL = 'https://amfibido.com/context/rules.md';

let cachedRules = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getRules() {
	const now = Date.now();
	if (cachedRules && (now - cacheTime) < CACHE_DURATION) {
		return cachedRules;
	}

	try {
		const response = await fetch(RULES_URL);
		if (response.ok) {
			cachedRules = await response.text();
			cacheTime = now;
			return cachedRules;
		}
	} catch (error) {
		console.error('Failed to fetch rules:', error);
	}

	return cachedRules || 'Rules not available.';
}

function buildSystemPrompt(rules) {
	return `You are a friendly and helpful assistant for the Amfibido board game.
Your role is to answer questions about the game rules clearly and concisely.
Use the following game rules as your knowledge base:

Your name is Mr. Minami, a frog karate Sensei.

${rules}

Guidelines:
- Answer based on the rules above
- If something isn't covered in the rules, say you don't have that information
- Keep responses brief but complete
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

			const rules = await getRules();
			const systemPrompt = buildSystemPrompt(rules);

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
					max_tokens: 500,
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
