import type { APIRoute } from 'astro';
import { seedAutocompleteCatalog } from '../../../lib/autocomplete';

export const prerender = false;

export const POST: APIRoute = async () => {
	try {
		const meta = await seedAutocompleteCatalog();
		return new Response(JSON.stringify({ ok: true, meta }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Seed failed';
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};

export const GET: APIRoute = async () =>
	new Response(JSON.stringify({ error: 'Use POST to seed the autocomplete cache.' }), {
		status: 405,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
