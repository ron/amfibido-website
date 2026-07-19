#!/usr/bin/env node
/**
 * Golden-answer eval for Mr. Minami.
 * Loads local context markdown, builds the same system prompt as the worker,
 * calls OpenRouter, and checks includes/excludes.
 *
 * Usage (from workers/chat):
 *   OPENROUTER_API_KEY=... node eval/run.mjs
 *   # or put OPENROUTER_API_KEY in .dev.vars
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTEXT_DIR = join(ROOT, '../../context');
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

const DEFAULT_PRODUCT_CONTEXT = `## Direct answers (use plain wording only)
- **Is the art AI?** **Yes.** Amfibido includes AI-generated art, as well as art from other sources.`;

function loadDevVars() {
	const path = join(ROOT, '.dev.vars');
	if (!existsSync(path)) return {};
	const out = {};
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		out[key] = value;
	}
	return out;
}

function buildSystemPrompt(rules, cards, reminders, product) {
	const productText = (product && product.trim()) || DEFAULT_PRODUCT_CONTEXT;
	return `You are a friendly, concise assistant for the Amfibido board game.
Your job is to give correct **rules and card text** (rulings), not strategy, hype, or filler.
Your name is Mr. Minami, a frog karate Sensei.

## Amfibido product and publishing
For questions about AI/art, publishing, components, or the product (not gameplay rules), use **only** the text below.
- Answer in **1–2 short sentences**. If a yes/no is enough, start with **Yes** or **No** then at most one more sentence.
- **Do not** add filler: no talk of algorithms, "automated processes", efficiency, "design execution", consistency, style systems, or similar. Do not "sell" the game—state the facts from this block only.
- Match the user’s topic to the closest fact here (including what components are for). Casual wording still counts if the topic is covered — answer the fact; do not refuse as strategy or “unknown”.
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
- If the product block or reminders answer a component/product question, answer from those facts — do not decline as “unknown” or invent house rules.
- Cite the relevant piece when useful (e.g. "Per the FAQ on combo moves and replacing…" or "The Spawn card says…").
- Keep normal answers brief: at most **4 sentences** (rules questions) after any single clarifying question.
- **Do not** give strategy (what to do to win); only what the rules allow or require. Stating what a product component is for (from the product/reminders facts) is not strategy.`;
}

function matchesAny(text, patterns) {
	const lower = text.toLowerCase();
	return patterns.some((p) => lower.includes(p.toLowerCase()));
}

function matchesAllExcludes(text, patterns) {
	const lower = text.toLowerCase();
	return patterns.filter((p) => lower.includes(p.toLowerCase()));
}

async function askModel(apiKey, model, systemPrompt, messages) {
	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'https://amfibido.com',
			'X-Title': 'Amfibido Mr Minami Eval',
		},
		body: JSON.stringify({
			model,
			temperature: 0,
			messages: [{ role: 'system', content: systemPrompt }, ...messages],
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 400)}`);
	}

	const data = await response.json();
	const content = data.choices?.[0]?.message?.content;
	if (!content) throw new Error('Empty model response');
	return content.trim();
}

async function main() {
	const devVars = loadDevVars();
	const apiKey = process.env.OPENROUTER_API_KEY || devVars.OPENROUTER_API_KEY;
	const model = process.env.OPENROUTER_MODEL || devVars.OPENROUTER_MODEL || DEFAULT_MODEL;

	if (!apiKey) {
		console.error('Missing OPENROUTER_API_KEY (env or workers/chat/.dev.vars)');
		process.exit(1);
	}

	const rules = readFileSync(join(CONTEXT_DIR, 'rules.md'), 'utf8');
	const cards = readFileSync(join(CONTEXT_DIR, 'cards.md'), 'utf8');
	const reminders = readFileSync(join(CONTEXT_DIR, 'reminders.md'), 'utf8');
	const product = readFileSync(join(CONTEXT_DIR, 'product.md'), 'utf8');
	const systemPrompt = buildSystemPrompt(rules, cards, reminders, product);
	const cases = JSON.parse(readFileSync(join(__dirname, 'cases.json'), 'utf8'));

	console.log(`Model: ${model}`);
	console.log(`Cases: ${cases.length}\n`);

	let failed = 0;
	for (const testCase of cases) {
		process.stdout.write(`[${testCase.id}] `);
		try {
			const reply = await askModel(apiKey, model, systemPrompt, testCase.messages);
			const { includesAny = [], excludes = [] } = testCase.expect || {};
			const missingIncludes =
				includesAny.length && !matchesAny(reply, includesAny) ? includesAny : [];
			const hitExcludes = matchesAllExcludes(reply, excludes);
			const pass = missingIncludes.length === 0 && hitExcludes.length === 0;

			if (pass) {
				console.log('PASS');
			} else {
				failed += 1;
				console.log('FAIL');
				if (missingIncludes.length) {
					console.log(`  missing includesAny (need one of): ${missingIncludes.join(' | ')}`);
				}
				if (hitExcludes.length) {
					console.log(`  hit excludes: ${hitExcludes.join(' | ')}`);
				}
				console.log(`  reply: ${reply.replace(/\n/g, ' / ')}\n`);
			}
		} catch (err) {
			failed += 1;
			console.log('ERROR');
			console.log(`  ${err.message}\n`);
		}
	}

	console.log(failed === 0 ? `\nAll ${cases.length} cases passed.` : `\n${failed}/${cases.length} failed.`);
	process.exit(failed === 0 ? 0 : 1);
}

main();
