import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PriceEvent } from '../src/types';
import worker from '../src';

const mockedVehiclePrice = {
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

describe('Scheduled worker', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('executa tick do pipeline para vehicleTypes 1,2,3 e envia preços ao STREAM', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
			const url = String(input);

			if (url.endsWith('/ConsultarTabelaDeReferencia')) {
				return Response.json([{ Codigo: 315, Mes: 'julho/2026' }]);
			}
			if (url.endsWith('/ConsultarMarcas/')) {
				const type = new URLSearchParams(String(init?.body ?? '')).get('codigoTipoVeiculo') ?? '1';
				return Response.json([{ Label: `Brand-${type}`, Value: `${type}0` }]);
			}
			if (url.endsWith('/ConsultarModelos/')) {
				return Response.json({
					Modelos: [{ Label: 'Palio 1.0', Value: 1234 }],
					Anos: [],
				});
			}
			if (url.endsWith('/ConsultarAnoModelo/')) {
				return Response.json([{ Label: '2015 Flex', Value: '2015-1' }]);
			}
			if (url.endsWith('/ConsultarValorComTodosParametros/')) {
				const type = Number(
					new URLSearchParams(String(init?.body ?? '')).get('codigoTipoVeiculo') ?? '1',
				);
				return Response.json({ ...mockedVehiclePrice, TipoVeiculo: type });
			}

			return new Response(null, { status: 404 });
		});

		const sentEvents: PriceEvent[] = [];
		const kvStore = new Map<string, string>();
		const testEnv = {
			...env,
			FIPE_CHECKPOINT: {
				async get(key: string, type?: string) {
					const value = kvStore.get(key);
					if (value == null) return null;
					if (type === 'json') return JSON.parse(value);
					return value;
				},
				async put(key: string, value: string) {
					kvStore.set(key, value);
				},
				async delete(key: string) {
					kvStore.delete(key);
				},
			},
			STREAM: {
				send: vi.fn(async (records: PriceEvent[]) => {
					sentEvents.push(...records);
				}),
			},
		} as unknown as Env;

		const ctx = createExecutionContext();
		await worker.scheduled?.(
			{ cron: '*/5 * * * *', scheduledTime: Date.now(), type: 'scheduled' } as ScheduledEvent,
			testEnv,
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(fetchMock).toHaveBeenCalled();
		expect(sentEvents).toHaveLength(3);
		expect(sentEvents.map((e) => e.TipoVeiculo)).toEqual([1, 2, 3]);
		expect(testEnv.STREAM.send).toHaveBeenCalledTimes(3);
		expect(kvStore.has('state')).toBe(true);
		const state = JSON.parse(kvStore.get('state')!);
		expect(state.stage).toBe('done');
		expect(state.vehicleTypeCursor).toBe(3);
	});

	it('não chama FIPE no cron */5 quando o mês já está done', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch');
		const kvStore = new Map<string, string>([
			[
				'state',
				JSON.stringify({
					stage: 'done',
					vehicleType: '3',
					vehicleTypeCursor: 3,
					monthId: '335',
					monthName: 'julho/2026',
					brandCursor: 0,
					modelCursor: 0,
					versionCursor: 0,
					updatedAt: new Date().toISOString(),
					stats: { brands: 1, models: 1, versions: 1, prices: 1 },
				}),
			],
		]);
		const testEnv = {
			...env,
			FIPE_CHECKPOINT: {
				async get(key: string, type?: string) {
					const value = kvStore.get(key);
					if (value == null) return null;
					if (type === 'json') return JSON.parse(value);
					return value;
				},
				async put(key: string, value: string) {
					kvStore.set(key, value);
				},
				async delete(key: string) {
					kvStore.delete(key);
				},
			},
			STREAM: { send: vi.fn(async () => {}) },
		} as unknown as Env;

		const ctx = createExecutionContext();
		await worker.scheduled?.(
			{ cron: '*/5 * * * *', scheduledTime: Date.now(), type: 'scheduled' } as ScheduledEvent,
			testEnv,
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(testEnv.STREAM.send).not.toHaveBeenCalled();
	});
});
