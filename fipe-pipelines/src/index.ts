import { fetchReferenceMonths } from './fipe/client';
import { loadState } from './pipeline/checkpoint';
import { runPipelineTick } from './pipeline/runner';

/** 12:00 America/Sao_Paulo on day 1 = 15:00 UTC. */
export const MONTHLY_CRON = '0 15 1 * *';

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/debug/fipe-months') {
			try {
				const { monthIds, monthMap } = await fetchReferenceMonths(fetch);
				return Response.json({
					ok: true,
					count: monthIds.length,
					latest: { id: monthIds[0], name: monthMap.get(monthIds[0]) },
				});
			} catch (error) {
				return Response.json(
					{ ok: false, error: error instanceof Error ? error.message : String(error) },
					{ status: 502 },
				);
			}
		}

		if (url.pathname === '/debug/checkpoint') {
			const state = await loadState(env.FIPE_CHECKPOINT);
			return Response.json({ ok: true, state });
		}

		if (url.pathname === '/debug/tick' && request.method === 'POST') {
			try {
				const result = await runPipelineTick(env, fetch);
				return Response.json(result);
			} catch (error) {
				return Response.json(
					{ ok: false, error: error instanceof Error ? error.message : String(error) },
					{ status: 500 },
				);
			}
		}

		return new Response('ok', { status: 200 });
	},

	async scheduled(event, env, _ctx): Promise<void> {
		const existing = await loadState(env.FIPE_CHECKPOINT);
		const isMonthlyKickoff = event.cron === MONTHLY_CRON;

		// */5 only continues an in-progress crawl — avoid hitting FIPE every 5 min when idle.
		if (existing?.stage === 'done' && !isMonthlyKickoff) {
			console.log(
				JSON.stringify({
					msg: 'pipeline_tick_skipped',
					reason: 'month already done; waiting for monthly kickoff',
					monthId: existing.monthId,
					cron: event.cron,
				}),
			);
			return;
		}

		const result = await runPipelineTick(env, fetch);
		console.log(
			JSON.stringify({
				msg: 'pipeline_tick',
				cron: event.cron,
				stage: result.state?.stage,
				monthId: result.state?.monthId,
				vehicleType: result.state?.vehicleType,
				vehicleTypeCursor: result.state?.vehicleTypeCursor,
				brandCursor: result.state?.brandCursor,
				modelCursor: result.state?.modelCursor,
				versionCursor: result.state?.versionCursor,
				stats: result.state?.stats,
				processed: result.processed,
				skipped: result.skipped,
				reason: result.reason,
			}),
		);
	},
} satisfies ExportedHandler<Env>;
