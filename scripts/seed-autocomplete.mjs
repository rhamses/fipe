import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 'fipe_lp_autocomplete';
const SHARD_SIZE = 4_000;
const NAMESPACE_ID = '00ca0b8ef45143f6aede0d5dd2d32e65';

for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) continue;
	const index = trimmed.indexOf('=');
	if (index <= 0) continue;
	const key = trimmed.slice(0, index);
	const value = trimmed.slice(index + 1);
	if (!process.env[key]) process.env[key] = value;
}

const warehouse = process.env.WAREHOUSE;
const token = process.env.TOKEN;
if (!warehouse || !token) {
	throw new Error('WAREHOUSE and TOKEN are required in .env');
}

const separator = warehouse.indexOf('_');
const accountId = warehouse.slice(0, separator);
const bucketName = warehouse.slice(separator + 1);

const normalizeSearch = (value) =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

const formatYear = (year) => (Number(year) === 32000 ? '0km' : String(year));

console.log('Querying R2 SQL for variations…');
const response = await fetch(
	`https://api.sql.cloudflarestorage.com/api/v1/accounts/${accountId}/r2-sql/query/${bucketName}`,
	{
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({
			query: `
				SELECT brand_name, model_name, version_id, year_model, vehicle_id
				FROM silver.precos
				WHERE month_name != 'x'
					AND brand_name IS NOT NULL
					AND model_name IS NOT NULL
					AND year_model IS NOT NULL
				GROUP BY brand_name, model_name, version_id, year_model, vehicle_id
				ORDER BY brand_name, model_name, year_model
			`,
		}),
	},
);

if (!response.ok) {
	throw new Error(`R2 SQL failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
}

const payload = await response.json();
const rows = payload?.result?.rows ?? [];
console.log(`Loaded ${rows.length} variations`);

const entries = rows.map((row) => {
	const brand = String(row.brand_name ?? '').trim();
	const model = String(row.model_name ?? '').trim();
	const version = String(row.version_id ?? '').trim();
	const year = Number(row.year_model);
	const yearLabel = formatYear(year);
	const label = `${brand} ${model} · ${yearLabel}`.trim();
	return {
		label,
		search: normalizeSearch(`${brand} ${model} ${yearLabel} ${version}`),
		brand,
		model,
		version,
		year,
		vehicleId: Number(row.vehicle_id),
	};
});

const shards = [];
for (let i = 0; i < entries.length; i += SHARD_SIZE) {
	shards.push(entries.slice(i, i + SHARD_SIZE));
}

const meta = {
	prefix: PREFIX,
	total: entries.length,
	shards: Math.max(shards.length, 1),
	updatedAt: new Date().toISOString(),
};

const bulk = [{ key: `${PREFIX}:meta`, value: JSON.stringify(meta) }];

if (shards.length === 0) {
	bulk.push({ key: `${PREFIX}:shard:0`, value: JSON.stringify([]) });
} else {
	shards.forEach((shard, index) => {
		bulk.push({ key: `${PREFIX}:shard:${index}`, value: JSON.stringify(shard) });
	});
}

const outDir = join(ROOT, '.cache');
mkdirSync(outDir, { recursive: true });
const bulkPath = join(outDir, 'autocomplete-kv-bulk.json');
writeFileSync(bulkPath, JSON.stringify(bulk));
console.log(`Wrote ${bulk.length} KV pairs to ${bulkPath}`);

const result = spawnSync(
	'npx',
	['wrangler', 'kv', 'bulk', 'put', bulkPath, '--namespace-id', NAMESPACE_ID, '--remote'],
	{ cwd: ROOT, stdio: 'inherit' },
);

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}

console.log('Autocomplete cache seeded.', meta);
