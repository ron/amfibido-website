import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('chat worker', () => {
	it('OPTIONS returns CORS headers', async () => {
		const request = new Request('https://example.com/', { method: 'OPTIONS' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, getTestEnv(), ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
	});

	it('POST without message returns 400', async () => {
		const request = new Request('https://example.com/', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, getTestEnv(), ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('Message is required');
	});
});

function getTestEnv() {
	return {
		DB: undefined,
		OPENROUTER_API_KEY: 'test-key',
		OPENROUTER_MODEL: 'openai/gpt-4o-mini',
		RESEND_API_KEY: undefined,
	};
}
