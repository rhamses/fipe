import type { BrandTuple, ModelTuple, VersionTuple } from '../fipe/types';

export type PipelineStage = 'init' | 'brands' | 'models' | 'versions' | 'prices' | 'done';

export const VEHICLE_TYPES = ['1', '2', '3'] as const;
export type VehicleTypeCode = (typeof VEHICLE_TYPES)[number];

export interface CheckpointState {
	stage: PipelineStage;
	/** Current vehicle type being crawled: "1" | "2" | "3". */
	vehicleType: string;
	/** Index into VEHICLE_TYPES. */
	vehicleTypeCursor: number;
	monthId: string;
	monthName: string;
	brandCursor: number;
	modelCursor: number;
	versionCursor: number;
	updatedAt: string;
	stats: {
		brands: number;
		models: number;
		versions: number;
		prices: number;
	};
}

export const KEYS = {
	lock: 'lock',
	state: 'state',
	brands: 'brands',
	brandMap: 'brandMap',
	monthMap: 'monthMap',
	modelMap: 'modelMap',
	currentModels: 'currentModels',
	currentVersions: 'currentVersions',
} as const;

export function emptyState(partial: {
	vehicleType?: string;
	vehicleTypeCursor?: number;
	monthId: string;
	monthName: string;
}): CheckpointState {
	const vehicleTypeCursor = partial.vehicleTypeCursor ?? 0;
	const vehicleType = partial.vehicleType ?? VEHICLE_TYPES[vehicleTypeCursor] ?? VEHICLE_TYPES[0];
	return {
		stage: 'brands',
		vehicleType,
		vehicleTypeCursor,
		monthId: partial.monthId,
		monthName: partial.monthName,
		brandCursor: 0,
		modelCursor: 0,
		versionCursor: 0,
		updatedAt: new Date().toISOString(),
		stats: { brands: 0, models: 0, versions: 0, prices: 0 },
	};
}

/** Backfill fields missing from older checkpoint payloads. */
export function normalizeState(state: CheckpointState): CheckpointState {
	if (typeof state.vehicleTypeCursor !== 'number' || Number.isNaN(state.vehicleTypeCursor)) {
		const idx = VEHICLE_TYPES.indexOf(state.vehicleType as VehicleTypeCode);
		state.vehicleTypeCursor = idx >= 0 ? idx : 0;
		state.vehicleType = VEHICLE_TYPES[state.vehicleTypeCursor];
	}
	return state;
}

export async function acquireLock(kv: KVNamespace, ttlSeconds = 240): Promise<boolean> {
	const existing = await kv.get(KEYS.lock);
	if (existing) {
		return false;
	}
	await kv.put(KEYS.lock, new Date().toISOString(), { expirationTtl: ttlSeconds });
	return true;
}

export async function releaseLock(kv: KVNamespace): Promise<void> {
	await kv.delete(KEYS.lock);
}

export async function loadState(kv: KVNamespace): Promise<CheckpointState | null> {
	const state = await kv.get<CheckpointState>(KEYS.state, 'json');
	return state ? normalizeState(state) : null;
}

export async function saveState(kv: KVNamespace, state: CheckpointState): Promise<void> {
	state.updatedAt = new Date().toISOString();
	await kv.put(KEYS.state, JSON.stringify(state));
}

export async function loadJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
	return kv.get<T>(key, 'json');
}

export async function saveJson(kv: KVNamespace, key: string, value: unknown): Promise<void> {
	await kv.put(key, JSON.stringify(value));
}

export async function loadBrandQueue(kv: KVNamespace): Promise<BrandTuple[]> {
	return (await loadJson<BrandTuple[]>(kv, KEYS.brands)) ?? [];
}

export async function loadCurrentModels(kv: KVNamespace): Promise<ModelTuple[]> {
	return (await loadJson<ModelTuple[]>(kv, KEYS.currentModels)) ?? [];
}

export async function loadCurrentVersions(kv: KVNamespace): Promise<VersionTuple[]> {
	return (await loadJson<VersionTuple[]>(kv, KEYS.currentVersions)) ?? [];
}

export async function loadStringMap(kv: KVNamespace, key: string): Promise<Map<string, string>> {
	const record = (await loadJson<Record<string, string>>(kv, key)) ?? {};
	return new Map(Object.entries(record));
}

export async function saveStringMap(
	kv: KVNamespace,
	key: string,
	map: Map<string, string>,
): Promise<void> {
	await saveJson(kv, key, Object.fromEntries(map));
}

export async function mergeStringMap(
	kv: KVNamespace,
	key: string,
	incoming: Map<string, string>,
): Promise<Map<string, string>> {
	const current = await loadStringMap(kv, key);
	for (const [id, label] of incoming) {
		current.set(id, label);
	}
	await saveStringMap(kv, key, current);
	return current;
}

/** Reset per-vehicle-type working queues and advance to the next type (or done). */
export async function advanceToNextVehicleType(
	kv: KVNamespace,
	state: CheckpointState,
): Promise<CheckpointState> {
	state.vehicleTypeCursor += 1;
	state.brandCursor = 0;
	state.modelCursor = 0;
	state.versionCursor = 0;
	await saveJson(kv, KEYS.brands, []);
	await saveJson(kv, KEYS.currentModels, []);
	await saveJson(kv, KEYS.currentVersions, []);
	await saveStringMap(kv, KEYS.brandMap, new Map());
	await saveStringMap(kv, KEYS.modelMap, new Map());

	if (state.vehicleTypeCursor >= VEHICLE_TYPES.length) {
		state.stage = 'done';
	} else {
		state.vehicleType = VEHICLE_TYPES[state.vehicleTypeCursor];
		state.stage = 'brands';
	}
	await saveState(kv, state);
	return state;
}
