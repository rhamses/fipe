import {
	fetchBrands,
	fetchModels,
	fetchPriceEvent,
	fetchReferenceMonths,
	fetchVersions,
} from '../fipe/client';
import type { BrandTuple, ModelTuple, PriceEvent, VersionTuple } from '../fipe/types';
import {
	acquireLock,
	advanceToNextVehicleType,
	emptyState,
	KEYS,
	loadBrandQueue,
	loadCurrentModels,
	loadCurrentVersions,
	loadState,
	loadStringMap,
	mergeStringMap,
	releaseLock,
	saveJson,
	saveState,
	saveStringMap,
	VEHICLE_TYPES,
	type CheckpointState,
} from './checkpoint';

/** Max FIPE API calls per cron tick (leave room under WAF + subrequest limits). */
export const API_BUDGET = 40;

export interface PipelineResult {
	ok: boolean;
	skipped?: boolean;
	reason?: string;
	state: CheckpointState | null;
	processed: {
		apiCalls: number;
		pricesSent: number;
	};
}

type FetchFn = typeof fetch;

export async function runPipelineTick(
	env: Pick<Env, 'FIPE_CHECKPOINT' | 'STREAM'>,
	fetchFn: FetchFn = fetch,
): Promise<PipelineResult> {
	const kv = env.FIPE_CHECKPOINT;
	const locked = await acquireLock(kv);
	if (!locked) {
		return {
			ok: true,
			skipped: true,
			reason: 'lock held',
			state: await loadState(kv),
			processed: { apiCalls: 0, pricesSent: 0 },
		};
	}

	let apiCalls = 0;
	let pricesSent = 0;

	try {
		let state = await loadState(kv);

		if (!state || state.stage === 'done' || state.stage === 'init') {
			const months = await fetchReferenceMonths(fetchFn);
			apiCalls += 1;
			const monthId = months.monthIds[0];
			if (!monthId) {
				throw new Error('No reference month returned by FIPE');
			}
			const monthName = months.monthMap.get(monthId) ?? monthId;

			if (state?.monthId === monthId && state.stage === 'done') {
				await saveState(kv, state);
				return {
					ok: true,
					skipped: true,
					reason: `month ${monthId} already completed for vehicleTypes ${VEHICLE_TYPES.join(',')}`,
					state,
					processed: { apiCalls, pricesSent },
				};
			}

			if (!state || state.monthId !== monthId) {
				state = emptyState({ monthId, monthName });
				await saveStringMap(kv, KEYS.monthMap, months.monthMap);
				await saveJson(kv, KEYS.brands, []);
				await saveJson(kv, KEYS.currentModels, []);
				await saveJson(kv, KEYS.currentVersions, []);
				await saveStringMap(kv, KEYS.brandMap, new Map());
				await saveStringMap(kv, KEYS.modelMap, new Map());
			}
		}

		while (apiCalls < API_BUDGET && state.stage !== 'done') {
			if (state.stage === 'brands') {
				const brands = await fetchBrands(fetchFn, state.vehicleType, state.monthId);
				apiCalls += 1;
				if (!brands) {
					throw new Error(
						`Failed to fetch brands for vehicleType=${state.vehicleType} month=${state.monthId}`,
					);
				}
				await saveJson(kv, KEYS.brands, brands.brandTuples);
				await saveStringMap(kv, KEYS.brandMap, brands.brandMap);
				state.stats.brands += brands.brandTuples.length;
				state.brandCursor = 0;
				state.modelCursor = 0;
				state.versionCursor = 0;

				if (brands.brandTuples.length === 0) {
					state = await advanceToNextVehicleType(kv, state);
				} else {
					state.stage = 'models';
					await saveState(kv, state);
				}
				continue;
			}

			const brandQueue = await loadBrandQueue(kv);
			if (state.brandCursor >= brandQueue.length) {
				state = await advanceToNextVehicleType(kv, state);
				continue;
			}

			let models = await loadCurrentModels(kv);
			const brand = brandQueue[state.brandCursor];
			const needsModels =
				models.length === 0 ||
				!models[0] ||
				models[0][0] !== state.vehicleType ||
				models[0][2] !== brand[2] ||
				models[0][1] !== brand[1];

			if (needsModels) {
				if (apiCalls >= API_BUDGET) break;
				const [, monthId, brandId] = brand;
				const result = await fetchModels(fetchFn, state.vehicleType, monthId, brandId);
				apiCalls += 1;
				if (!result) {
					state.brandCursor += 1;
					state.modelCursor = 0;
					state.versionCursor = 0;
					await saveJson(kv, KEYS.currentModels, []);
					await saveJson(kv, KEYS.currentVersions, []);
					await saveState(kv, state);
					continue;
				}
				models = result.modelTuples;
				await saveJson(kv, KEYS.currentModels, models);
				await mergeStringMap(kv, KEYS.modelMap, result.modelMap);
				state.stats.models += models.length;
				state.modelCursor = 0;
				state.versionCursor = 0;
				state.stage = 'versions';
				await saveState(kv, state);
				if (models.length === 0) {
					state.brandCursor += 1;
					await saveJson(kv, KEYS.currentModels, []);
					await saveState(kv, state);
				}
				continue;
			}

			if (state.modelCursor >= models.length) {
				state.brandCursor += 1;
				state.modelCursor = 0;
				state.versionCursor = 0;
				await saveJson(kv, KEYS.currentModels, []);
				await saveJson(kv, KEYS.currentVersions, []);
				state.stage = 'models';
				await saveState(kv, state);
				continue;
			}

			const model = models[state.modelCursor] as ModelTuple;
			let versions = await loadCurrentVersions(kv);
			const needsVersions =
				versions.length === 0 ||
				!versions[0] ||
				versions[0][0] !== state.vehicleType ||
				versions[0][2] !== model[2] ||
				versions[0][3] !== model[3];

			if (needsVersions) {
				if (apiCalls >= API_BUDGET) break;
				const [, monthId, brandId, modelId] = model;
				const result = await fetchVersions(fetchFn, state.vehicleType, monthId, brandId, modelId);
				apiCalls += 1;
				if (!result) {
					state.modelCursor += 1;
					state.versionCursor = 0;
					await saveJson(kv, KEYS.currentVersions, []);
					await saveState(kv, state);
					continue;
				}
				versions = result.versionTuples;
				await saveJson(kv, KEYS.currentVersions, versions);
				state.stats.versions += versions.length;
				state.versionCursor = 0;
				state.stage = 'prices';
				await saveState(kv, state);
				if (versions.length === 0) {
					state.modelCursor += 1;
					await saveJson(kv, KEYS.currentVersions, []);
					await saveState(kv, state);
				}
				continue;
			}

			const brandMap = await loadStringMap(kv, KEYS.brandMap);
			const modelMap = await loadStringMap(kv, KEYS.modelMap);
			const monthMap = await loadStringMap(kv, KEYS.monthMap);
			const versionMap = new Map<string, string>();

			while (state.versionCursor < versions.length && apiCalls < API_BUDGET) {
				const version = versions[state.versionCursor] as VersionTuple;
				const priceEvent: PriceEvent | null = await fetchPriceEvent(fetchFn, version, {
					brandMap,
					modelMap,
					versionMap,
					monthMap,
				});
				apiCalls += 1;
				if (priceEvent) {
					await env.STREAM.send([priceEvent]);
					pricesSent += 1;
					state.stats.prices += 1;
				}
				state.versionCursor += 1;
				await saveState(kv, state);
			}

			if (state.versionCursor >= versions.length) {
				state.modelCursor += 1;
				state.versionCursor = 0;
				await saveJson(kv, KEYS.currentVersions, []);
				state.stage = 'versions';
				await saveState(kv, state);
			}
		}

		return {
			ok: true,
			state,
			processed: { apiCalls, pricesSent },
		};
	} finally {
		await releaseLock(kv);
	}
}

export type { BrandTuple, CheckpointState };
export { VEHICLE_TYPES };
