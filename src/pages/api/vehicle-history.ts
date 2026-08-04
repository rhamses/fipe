import type { APIRoute } from 'astro';
import { resolveConsultaHistory } from '../../lib/consulta-cache';
import { buildVehicleForecast } from '../../lib/vehicle-forecast';
import { getVehiclePriceHistory } from '../../lib/vehicle-history';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	try {
		const brand = url.searchParams.get('brand') ?? '';
		const model = url.searchParams.get('model') ?? '';
		const version = url.searchParams.get('version') ?? '';
		const year = Number(url.searchParams.get('year'));
		const vehicleId = Number(url.searchParams.get('vehicleId'));

		if (!brand || !model || !Number.isFinite(year) || !Number.isFinite(vehicleId)) {
			return new Response(
				JSON.stringify({ error: 'Parâmetros obrigatórios: brand, model, year, vehicleId' }),
				{ status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
			);
		}

		const params = { brand, model, version, year, vehicleId };
		const { history, source } = await resolveConsultaHistory(params, getVehiclePriceHistory);

		if (!history.forecast) {
			history.forecast = await buildVehicleForecast(history, year);
		}

		return new Response(JSON.stringify(history), {
			status: 200,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Cache-Control': 'public, max-age=60',
				'X-Consulta-Source': source,
				'X-Forecast-Method': history.forecast?.method ?? 'none',
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Falha ao carregar histórico';
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};
