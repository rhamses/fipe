import { describe, expect, it, vi } from 'vitest';
import {
	FIPE_HOST,
	fetchBrands,
	fetchModels,
	fetchPrice,
	fetchPriceEvent,
	fetchReferenceMonths,
	fetchVersions,
} from '../../src/fipe/client';

function mockJsonResponse(data: unknown, ok = true, status = 200) {
	return {
		ok,
		status,
		json: vi.fn().mockResolvedValue(data),
	} as unknown as Response;
}

describe('fetchReferenceMonths', () => {
	it('consulta meses de referência na API FIPE', async () => {
		const months = [{ Codigo: 315, Mes: 'julho/2026' }];
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(months));

		const result = await fetchReferenceMonths(fetchFn);

		expect(fetchFn).toHaveBeenCalledWith(
			`${FIPE_HOST}/ConsultarTabelaDeReferencia`,
			expect.objectContaining({
				method: 'POST',
				redirect: 'follow',
				headers: expect.objectContaining({
					Origin: 'https://veiculos.fipe.org.br',
					Referer: 'https://veiculos.fipe.org.br/',
				}),
			}),
		);
		expect(fetchFn.mock.calls[0][1].body).toBe('');
		expect(fetchFn.mock.calls[0][1].headers).toEqual(
			expect.objectContaining({
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			}),
		);
		expect(result.monthIds).toEqual(['315']);
		expect(result.monthMap.get('315')).toBe('julho/2026');
	});

	it('lança erro quando a API falha', async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			headers: new Headers({ 'content-type': 'text/plain' }),
			text: vi.fn().mockResolvedValue('boom'),
			json: vi.fn(),
		} as unknown as Response);

		await expect(fetchReferenceMonths(fetchFn)).rejects.toThrow(
			'Failed to fetch reference months: 500 text/plain boom',
		);
	});
});

describe('fetchBrands', () => {
	it('envia POST com tipo de veículo e mês de referência', async () => {
		const brands = [{ Label: 'Fiat', Value: '21' }];
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(brands));

		const result = await fetchBrands(fetchFn, '1', '315');

		expect(fetchFn).toHaveBeenCalledWith(
			`${FIPE_HOST}/ConsultarMarcas/`,
			expect.objectContaining({ method: 'POST' }),
		);
		const body = fetchFn.mock.calls[0][1].body as URLSearchParams;
		expect(body.get('codigoTipoVeiculo')).toBe('1');
		expect(body.get('codigoTabelaReferencia')).toBe('315');
		expect(result?.brandTuples).toEqual([['1', '315', '21']]);
		expect(result?.brandMap.get('21')).toBe('Fiat');
	});

	it('retorna null quando a API falha', async () => {
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(null, false, 400));

		const result = await fetchBrands(fetchFn, '1', '315');

		expect(result).toBeNull();
	});
});

describe('fetchModels', () => {
	it('envia POST com marca e retorna modelos', async () => {
		const models = {
			Modelos: [{ Label: 'Palio 1.0', Value: 1234 }],
			Anos: [],
		};
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(models));

		const result = await fetchModels(fetchFn, '1', '315', '21');

		expect(fetchFn).toHaveBeenCalledWith(
			`${FIPE_HOST}/ConsultarModelos/`,
			expect.objectContaining({ method: 'POST' }),
		);
		const body = fetchFn.mock.calls[0][1].body as URLSearchParams;
		expect(body.get('codigoMarca')).toBe('21');
		expect(result?.modelTuples).toEqual([['1', '315', '21', 1234]]);
		expect(result?.modelMap.get('21_1234')).toBe('Palio 1.0');
	});

	it('retorna null quando a API falha', async () => {
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(null, false, 400));

		const result = await fetchModels(fetchFn, '1', '315', '21');

		expect(result).toBeNull();
	});
});

describe('fetchVersions', () => {
	it('envia POST com modelo e retorna versões', async () => {
		const versions = [{ Label: '2015 Flex', Value: '2015-1' }];
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(versions));

		const result = await fetchVersions(fetchFn, '1', '315', '21', 1234);

		expect(fetchFn).toHaveBeenCalledWith(
			`${FIPE_HOST}/ConsultarAnoModelo/`,
			expect.objectContaining({ method: 'POST' }),
		);
		const body = fetchFn.mock.calls[0][1].body as URLSearchParams;
		expect(body.get('codigoModelo')).toBe('1234');
		expect(result?.versionTuples).toEqual([['1', '315', '21', 1234, '2015-1']]);
		expect(result?.versionMap.get('21_1234_2015-1')).toBe('2015 Flex');
	});

	it('retorna null quando a API falha', async () => {
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(null, false, 400));

		const result = await fetchVersions(fetchFn, '1', '315', '21', 1234);

		expect(result).toBeNull();
	});
});

describe('fetchPrice', () => {
	it('envia POST com parâmetros derivados da versão', async () => {
		const price = {
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
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(price));

		const result = await fetchPrice(fetchFn, {
			vehicleType: '1',
			monthId: '315',
			brandId: '21',
			modelId: 1234,
			versionId: '2015-1',
		});

		expect(fetchFn).toHaveBeenCalledWith(
			`${FIPE_HOST}/ConsultarValorComTodosParametros/`,
			expect.objectContaining({ method: 'POST' }),
		);
		const body = fetchFn.mock.calls[0][1].body as URLSearchParams;
		expect(body.get('anoModelo')).toBe('2015');
		expect(body.get('codigoTipoCombustivel')).toBe('1');
		expect(body.get('tipoConsulta')).toBe('tradicional');
		expect(result).toEqual(price);
	});

	it('retorna null quando a API falha', async () => {
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(null, false, 400));

		const result = await fetchPrice(fetchFn, {
			vehicleType: '1',
			monthId: '315',
			brandId: '21',
			modelId: 1234,
			versionId: '2015-1',
		});

		expect(result).toBeNull();
	});
});

describe('fetchPriceEvent', () => {
	it('monta evento enriquecido com labels dos mapas', async () => {
		const price = {
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
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(price));

		const result = await fetchPriceEvent(fetchFn, ['1', '315', '21', 1234, '2015-1'], {
			brandMap: new Map([['21', 'Fiat']]),
			modelMap: new Map([['21_1234', 'Palio 1.0']]),
			versionMap: new Map([['21_1234_2015-1', '2015 Flex']]),
			monthMap: new Map([['315', 'julho/2026']]),
		});

		expect(result).toEqual({
			Brand: 'Fiat',
			BrandId: '21',
			Model: 'Palio 1.0',
			ModelId: 1234,
			Version: '2015-1',
			VersionId: '2015-1',
			Month: 'julho/2026',
			MonthId: '315',
			...price,
		});
	});

	it('retorna null quando a consulta de preço falha', async () => {
		const fetchFn = vi.fn().mockResolvedValue(mockJsonResponse(null, false, 400));

		const result = await fetchPriceEvent(fetchFn, ['1', '315', '21', 1234, '2015-1'], {
			brandMap: new Map(),
			modelMap: new Map(),
			versionMap: new Map(),
			monthMap: new Map(),
		});

		expect(result).toBeNull();
	});
});
