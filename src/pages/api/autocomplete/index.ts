import type { APIRoute } from 'astro';
import { searchAutocomplete } from '../../../lib/autocomplete';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	try {
		const query = url.searchParams.get('q') ?? url.searchParams.get('search') ?? '';
		const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
		const results = await searchAutocomplete(query, Number.isFinite(limit) ? limit : 20);

		return new Response(JSON.stringify({ query, count: results.length, results }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Cache-Control': 'public, max-age=30',
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Autocomplete failed';
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};
