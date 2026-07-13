import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	acquireLock,
	emptyState,
	KEYS,
	loadState,
	releaseLock,
	saveJson,
	saveState,
	saveStringMap,
	VEHICLE_TYPES,
} from '../../src/pipeline/checkpoint';
import { API_BUDGET, runPipelineTick } from '../../src/pipeline/runner';

function memoryKv() {
	const store = new Map<string, string>();
	return {
		store,
		async get(key: string, type?: string) {
			const value = store.get(key);
			if (value == null) return null;
			if (type === 'json') return JSON.parse(value);
			return value;
		},
		async put(key: string, value: string, _opts?: { expirationTtl?: number }) {
			store.set(key, value);
		},
		async delete(key: string) {
			store.delete(key);
		},
	} as unknown as KVNamespace & { store: Map<string, string> };
}

const pricePayload = {
	Valor: 'R$ 30.000,00',
	Marca: 'Fiat',
	Modelo: 'Palio 1.0',
	AnoModelo: 2015,
	Combustivel: 'Flex',
	CodigoFipe: '001234-0',
	MesReferencia: 'julho/2026',
	Autenticacao: 'abc123',
	TipoVeiculo: 1,
	SiglaCombustivel: 'F',
	DataConsulta: '2026-07-13',
};

function mockFetch() {
	return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		if (url.endsWith('/ConsultarTabelaDeReferencia')) {
			return Response.json([{ Codigo: 315, Mes: 'julho/2026' }]);
		}
		if (url.endsWith('/ConsultarMarcas/')) {
			const body = String(init?.body ?? '');
			const type = new URLSearchParams(body).get('codigoTipoVeiculo') ?? '1';
			return Response.json([{ Label: `Brand-${type}`, Value: `${type}0` }]);
		}
		if (url.endsWith('/ConsultarModelos/')) {
			return Response.json({
				Modelos: [{ Label: 'Model X', Value: 1234 }],
				Anos: [],
			});
		}
		if (url.endsWith('/ConsultarAnoModelo/')) {
			return Response.json([{ Label: '2015 Flex', Value: '2015-1' }]);
		}
		if (url.endsWith('/ConsultarValorComTodosParametros/')) {
			const body = String(init?.body ?? '');
			const type = Number(new URLSearchParams(body).get('codigoTipoVeiculo') ?? '1');
			return Response.json({ ...pricePayload, TipoVeiculo: type });
		}
		return new Response(null, { status: 404 });
	});
}

describe('checkpoint helpers', () => {
	it('adquire e libera lock', async () => {
		const kv = memoryKv();
		expect(await acquireLock(kv)).toBe(true);
		expect(await acquireLock(kv)).toBe(false);
		await releaseLock(kv);
		expect(await acquireLock(kv)).toBe(true);
	});

	it('persiste e lê estado com vehicleTypeCursor', async () => {
		const kv = memoryKv();
		const state = emptyState({ monthId: '315', monthName: 'julho/2026' });
		expect(state.vehicleType).toBe('1');
		expect(state.vehicleTypeCursor).toBe(0);
		await saveState(kv, state);
		const loaded = await loadState(kv);
		expect(loaded?.monthId).toBe('315');
		expect(loaded?.vehicleTypeCursor).toBe(0);
		expect(loaded?.stage).toBe('brands');
	});
});

describe('runPipelineTick', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('percorre vehicleTypes 1→2→3 e envia um preço por tipo', async () => {
		const kv = memoryKv();
		const sent: unknown[] = [];
		const env = {
			FIPE_CHECKPOINT: kv,
			STREAM: {
				send: vi.fn(async (records: unknown[]) => {
					sent.push(...records);
				}),
			},
		} as Pick<Env, 'FIPE_CHECKPOINT' | 'STREAM'>;

		const fetchFn = mockFetch();
		const result = await runPipelineTick(env, fetchFn as unknown as typeof fetch);

		expect(result.ok).toBe(true);
		expect(result.state?.stage).toBe('done');
		expect(result.state?.vehicleTypeCursor).toBe(VEHICLE_TYPES.length);
		expect(result.state?.stats.prices).toBe(3);
		expect(sent).toHaveLength(3);
		expect(sent.map((e) => (e as { TipoVeiculo: number }).TipoVeiculo)).toEqual([1, 2, 3]);

		const brandCalls = fetchFn.mock.calls.filter(([url]) => String(url).endsWith('/ConsultarMarcas/'));
		expect(brandCalls).toHaveLength(3);
		const types = brandCalls.map(([, init]) =>
			new URLSearchParams(String((init as RequestInit).body ?? '')).get('codigoTipoVeiculo'),
		);
		expect(types).toEqual(['1', '2', '3']);
	});

	it('respeita budget e retoma no próximo tick', async () => {
		const kv = memoryKv();
		const env = {
			FIPE_CHECKPOINT: kv,
			STREAM: { send: vi.fn(async () => {}) },
		} as Pick<Env, 'FIPE_CHECKPOINT' | 'STREAM'>;

		const state = emptyState({ monthId: '315', monthName: 'julho/2026' });
		state.stage = 'prices';
		state.stats.brands = 1;
		await saveState(kv, state);
		await saveJson(kv, KEYS.brands, [['1', '315', '10']]);
		await saveStringMap(kv, KEYS.brandMap, new Map([['10', 'Brand-1']]));
		await saveStringMap(kv, KEYS.monthMap, new Map([['315', 'julho/2026']]));
		await saveStringMap(kv, KEYS.modelMap, new Map([['10_1234', 'Model X']]));
		await saveJson(kv, KEYS.currentModels, [['1', '315', '10', 1234]]);
		const manyVersions = Array.from({ length: API_BUDGET + 5 }, (_, i) => [
			'1',
			'315',
			'10',
			1234,
			`2015-${i + 1}`,
		]);
		await saveJson(kv, KEYS.currentVersions, manyVersions);

		const fetchFn = mockFetch();
		const first = await runPipelineTick(env, fetchFn as unknown as typeof fetch);
		expect(first.state?.stage).toBe('prices');
		expect(first.state?.vehicleType).toBe('1');
		expect(first.processed.apiCalls).toBe(API_BUDGET);
		expect(first.state?.versionCursor).toBe(API_BUDGET);

		const second = await runPipelineTick(env, fetchFn as unknown as typeof fetch);
		// Finishes remaining type-1 prices, then crawls types 2 and 3 to completion.
		expect(second.state?.stage).toBe('done');
		expect(second.state?.stats.prices).toBe(API_BUDGET + 5 + 2);
	});

	it('pula tick quando lock está ativo', async () => {
		const kv = memoryKv();
		await acquireLock(kv);
		const env = {
			FIPE_CHECKPOINT: kv,
			STREAM: { send: vi.fn(async () => {}) },
		} as Pick<Env, 'FIPE_CHECKPOINT' | 'STREAM'>;

		const result = await runPipelineTick(env, mockFetch() as unknown as typeof fetch);
		expect(result.skipped).toBe(true);
		expect(result.reason).toBe('lock held');
	});
});
