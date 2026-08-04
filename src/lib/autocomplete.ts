import { env } from 'cloudflare:workers';
import { queryR2Sql } from './r2-sql';

export const AUTOCOMPLETE_PREFIX = 'fipe_lp_autocomplete';
export const AUTOCOMPLETE_META_KEY = `${AUTOCOMPLETE_PREFIX}:meta`;
export const AUTOCOMPLETE_SHARD_SIZE = 4_000;

export type AutocompleteEntry = {
	label: string;
	search: string;
	brand: string;
	model: string;
	version: string;
	year: number;
	vehicleId: number;
};

export type AutocompleteMeta = {
	prefix: string;
	total: number;
	shards: number;
	updatedAt: string;
};

type VariationRow = {
	brand_name: string;
	model_name: string;
	version_id: string;
	year_model: number;
	vehicle_id: number;
};

let memoryCatalog: AutocompleteEntry[] | null = null;
let memoryMetaVersion: string | null = null;

export function getCacheBinding(): KVNamespace {
	const cache = (env as Env).CACHE;
	if (!cache) {
		throw new Error('KV binding CACHE is not configured.');
	}
	return cache;
}

export const shardKey = (index: number) => `${AUTOCOMPLETE_PREFIX}:shard:${index}`;

export const normalizeSearch = (value: string) =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

const formatYear = (year: number) => (Number(year) === 32000 ? '0km' : String(year));

export const buildAutocompleteEntry = (row: VariationRow): AutocompleteEntry => {
	const brand = String(row.brand_name ?? '').trim();
	const model = String(row.model_name ?? '').trim();
	const version = String(row.version_id ?? '').trim();
	const year = Number(row.year_model);
	const yearLabel = formatYear(year);
	const label = `${brand} ${model} · ${yearLabel}`.trim();
	const search = normalizeSearch(`${brand} ${model} ${yearLabel} ${version}`);

	return {
		label,
		search,
		brand,
		model,
		version,
		year,
		vehicleId: Number(row.vehicle_id),
	};
};

export async function loadAutocompleteCatalog(
	cache: KVNamespace = getCacheBinding(),
): Promise<{ meta: AutocompleteMeta | null; entries: AutocompleteEntry[] }> {
	const meta = await cache.get<AutocompleteMeta>(AUTOCOMPLETE_META_KEY, 'json');
	if (!meta || meta.shards < 1) {
		memoryCatalog = null;
		memoryMetaVersion = null;
		return { meta: null, entries: [] };
	}

	if (memoryCatalog && memoryMetaVersion === meta.updatedAt) {
		return { meta, entries: memoryCatalog };
	}

	const shards = await Promise.all(
		Array.from({ length: meta.shards }, (_, index) =>
			cache.get<AutocompleteEntry[]>(shardKey(index), 'json'),
		),
	);

	const entries = shards.flatMap((shard) => shard ?? []);
	memoryCatalog = entries;
	memoryMetaVersion = meta.updatedAt;
	return { meta, entries };
}

export async function searchAutocomplete(
	query: string,
	limit = 20,
	cache: KVNamespace = getCacheBinding(),
): Promise<AutocompleteEntry[]> {
	const normalized = normalizeSearch(query);
	if (normalized.length < 2) return [];

	const { entries } = await loadAutocompleteCatalog(cache);
	if (entries.length === 0) return [];

	const terms = normalized.split(' ').filter(Boolean);
	const results: AutocompleteEntry[] = [];

	for (const entry of entries) {
		if (terms.every((term) => entry.search.includes(term))) {
			results.push(entry);
			if (results.length >= limit) break;
		}
	}

	return results;
}

export async function seedAutocompleteCatalog(
	cache: KVNamespace = getCacheBinding(),
): Promise<AutocompleteMeta> {
	const result = await queryR2Sql<VariationRow>(`
		SELECT brand_name, model_name, version_id, year_model, vehicle_id
		FROM silver.precos
		WHERE month_name != 'x'
			AND brand_name IS NOT NULL
			AND model_name IS NOT NULL
			AND year_model IS NOT NULL
		GROUP BY brand_name, model_name, version_id, year_model, vehicle_id
		ORDER BY brand_name, model_name, year_model
	`);

	const entries = (result.rows ?? []).map(buildAutocompleteEntry);
	const shards: AutocompleteEntry[][] = [];

	for (let i = 0; i < entries.length; i += AUTOCOMPLETE_SHARD_SIZE) {
		shards.push(entries.slice(i, i + AUTOCOMPLETE_SHARD_SIZE));
	}

	const meta: AutocompleteMeta = {
		prefix: AUTOCOMPLETE_PREFIX,
		total: entries.length,
		shards: Math.max(shards.length, 1),
		updatedAt: new Date().toISOString(),
	};

	const writes: Promise<void>[] = [
		cache.put(AUTOCOMPLETE_META_KEY, JSON.stringify(meta)),
	];

	if (shards.length === 0) {
		writes.push(cache.put(shardKey(0), JSON.stringify([])));
	} else {
		shards.forEach((shard, index) => {
			writes.push(cache.put(shardKey(index), JSON.stringify(shard)));
		});
	}

	await Promise.all(writes);

	memoryCatalog = entries;
	memoryMetaVersion = meta.updatedAt;

	return meta;
}
