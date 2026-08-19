import { getCacheBinding } from './autocomplete';
import type { VehicleHistoryResponse } from './vehicle-history';

export const CONSULTA_PREFIX = 'fipe_lp_consulta';

/** Cache do histórico: 6 horas (FIPE atualiza mensalmente). */
export const HISTORY_TTL_SECONDS = 60 * 60 * 6;

/** Log de consultas: 30 dias. */
export const LOG_TTL_SECONDS = 60 * 60 * 24 * 30;

export type ConsultaParams = {
	brand: string;
	model: string;
	version: string;
	year: number;
	vehicleId: number;
};

export type ConsultaLog = ConsultaParams & {
	at: string;
	source: 'cache' | 'sql';
	historyKey: string;
	latestPrice: number | null;
	title: string | null;
};

const slug = (value: string | number) =>
	String(value)
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '');

export const historyCacheKey = (params: ConsultaParams) =>
	`${CONSULTA_PREFIX}:history:v3:${slug(params.brand)}:${slug(params.model)}:${slug(params.version || 'x')}:${slug(params.year)}:${slug(params.vehicleId)}`;

export const logCacheKey = (at = new Date()) =>
	`${CONSULTA_PREFIX}:log:${at.toISOString().replace(/[:.]/g, '-')}:${crypto.randomUUID().slice(0, 8)}`;

export async function getCachedHistory(
	params: ConsultaParams,
	cache: KVNamespace = getCacheBinding(),
): Promise<VehicleHistoryResponse | null> {
	const key = historyCacheKey(params);
	return cache.get<VehicleHistoryResponse>(key, 'json');
}

export async function setCachedHistory(
	params: ConsultaParams,
	history: VehicleHistoryResponse,
	cache: KVNamespace = getCacheBinding(),
): Promise<string> {
	const key = historyCacheKey(params);
	await cache.put(key, JSON.stringify(history), {
		expirationTtl: HISTORY_TTL_SECONDS,
	});
	return key;
}

export async function logConsulta(
	entry: Omit<ConsultaLog, 'at' | 'historyKey'> & { historyKey?: string; at?: string },
	cache: KVNamespace = getCacheBinding(),
): Promise<string> {
	const at = entry.at ?? new Date().toISOString();
	const historyKey = entry.historyKey ?? historyCacheKey(entry);
	const key = logCacheKey(new Date(at));
	const payload: ConsultaLog = {
		at,
		brand: entry.brand,
		model: entry.model,
		version: entry.version,
		year: entry.year,
		vehicleId: entry.vehicleId,
		source: entry.source,
		historyKey,
		latestPrice: entry.latestPrice,
		title: entry.title,
	};
	await cache.put(key, JSON.stringify(payload), {
		expirationTtl: LOG_TTL_SECONDS,
	});
	return key;
}

/** Resolve histórico via CACHE (hit) ou SQL (miss), e registra a consulta. */
export async function resolveConsultaHistory(
	params: ConsultaParams,
	fetchHistory: (params: ConsultaParams) => Promise<VehicleHistoryResponse>,
	cache: KVNamespace = getCacheBinding(),
): Promise<{ history: VehicleHistoryResponse; source: 'cache' | 'sql' }> {
	const cached = await getCachedHistory(params, cache);
	if (cached) {
		await logConsulta(
			{
				...params,
				source: 'cache',
				latestPrice: cached.latestPrice,
				title: cached.title,
			},
			cache,
		);
		return { history: cached, source: 'cache' };
	}

	const history = await fetchHistory(params);
	const historyKey = await setCachedHistory(params, history, cache);
	await logConsulta(
		{
			...params,
			source: 'sql',
			historyKey,
			latestPrice: history.latestPrice,
			title: history.title,
		},
		cache,
	);
	return { history, source: 'sql' };
}
