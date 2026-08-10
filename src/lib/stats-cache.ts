import { getCacheBinding } from './autocomplete';
import { loadStatsPageData, type StatsPageData } from './stats-data';

export const STATS_PREFIX = 'fipe_lp_stats';
export const STATS_PAGE_KEY = `${STATS_PREFIX}:page`;

/** Stats mudam quando o pipeline silver atualiza; 6h evita martelar R2 SQL. */
export const STATS_TTL_SECONDS = 60 * 60 * 6;

export type CachedStatsPage = StatsPageData & {
	cachedAt: string;
	bytes?: number;
};

export async function getCachedStatsPage(
	cache: KVNamespace = getCacheBinding(),
): Promise<CachedStatsPage | null> {
	return cache.get<CachedStatsPage>(STATS_PAGE_KEY, 'json');
}

export async function setCachedStatsPage(
	data: StatsPageData,
	cache: KVNamespace = getCacheBinding(),
): Promise<{ key: string; bytes: number }> {
	const cachedAt = new Date().toISOString();
	const draft: CachedStatsPage = { ...data, cachedAt };
	const bytes = new TextEncoder().encode(JSON.stringify(draft)).byteLength;
	const payload: CachedStatsPage = { ...draft, bytes };
	await cache.put(STATS_PAGE_KEY, JSON.stringify(payload), {
		expirationTtl: STATS_TTL_SECONDS,
	});
	return { key: STATS_PAGE_KEY, bytes };
}

/**
 * Resolve o payload de /stats via KV (hit) ou R2 SQL (miss → write-through).
 * Erros de SQL não são cacheados.
 */
export async function resolveStatsPageData(
	cache: KVNamespace = getCacheBinding(),
): Promise<{ stats: StatsPageData; source: 'cache' | 'sql'; bytes: number | null }> {
	const cached = await getCachedStatsPage(cache);
	if (cached && !cached.error) {
		const { cachedAt: _cachedAt, bytes, ...stats } = cached;
		return { stats, source: 'cache', bytes: bytes ?? null };
	}

	const stats = await loadStatsPageData();
	if (stats.error) {
		return { stats, source: 'sql', bytes: null };
	}

	const { bytes } = await setCachedStatsPage(stats, cache);
	return { stats, source: 'sql', bytes };
}
