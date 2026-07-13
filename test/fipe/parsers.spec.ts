import { describe, expect, it } from 'vitest';
import {
	buildPriceEvent,
	parseBrands,
	parseModels,
	parseReferenceMonths,
	parseVersionId,
	parseVersions,
} from '../../src/fipe/parsers';

describe('parseReferenceMonths', () => {
	it('extrai ids e mapa de meses de referência', () => {
		const months = [
			{ Codigo: 315, Mes: 'julho/2026' },
			{ Codigo: 314, Mes: 'junho/2026' },
		];

		const { monthIds, monthMap } = parseReferenceMonths(months);

		expect(monthIds).toEqual(['315', '314']);
		expect(monthMap.get('315')).toBe('julho/2026');
		expect(monthMap.get('314')).toBe('junho/2026');
	});
});

describe('parseBrands', () => {
	it('monta tuplas de marca e mapa de labels', () => {
		const brands = [
			{ Label: 'Fiat', Value: '21' },
			{ Label: 'VW - VolksWagen', Value: '59' },
		];

		const { brandTuples, brandMap } = parseBrands('1', '315', brands);

		expect(brandTuples).toEqual([
			['1', '315', '21'],
			['1', '315', '59'],
		]);
		expect(brandMap.get('21')).toBe('Fiat');
		expect(brandMap.get('59')).toBe('VW - VolksWagen');
	});
});

describe('parseModels', () => {
	it('monta tuplas de modelo e mapa de labels', () => {
		const data = {
			Modelos: [
				{ Label: 'Palio 1.0', Value: 1234 },
				{ Label: 'Uno 1.0', Value: 5678 },
			],
			Anos: [],
		};

		const { modelTuples, modelMap } = parseModels('1', '315', '21', data);

		expect(modelTuples).toEqual([
			['1', '315', '21', 1234],
			['1', '315', '21', 5678],
		]);
		expect(modelMap.get('21_1234')).toBe('Palio 1.0');
		expect(modelMap.get('21_5678')).toBe('Uno 1.0');
	});
});

describe('parseVersions', () => {
	it('monta tuplas de versão e mapa de labels', () => {
		const versions = [
			{ Label: '2015 Flex', Value: '2015-1' },
			{ Label: '2014 Gasolina', Value: '2014-3' },
		];

		const { versionTuples, versionMap } = parseVersions('1', '315', '21', 1234, versions);

		expect(versionTuples).toEqual([
			['1', '315', '21', 1234, '2015-1'],
			['1', '315', '21', 1234, '2014-3'],
		]);
		expect(versionMap.get('21_1234_2015-1')).toBe('2015 Flex');
		expect(versionMap.get('21_1234_2014-3')).toBe('2014 Gasolina');
	});
});

describe('parseVersionId', () => {
	it('separa ano do modelo e tipo de combustível', () => {
		expect(parseVersionId('2015-1')).toEqual({
			anoModelo: '2015',
			tipoFuel: '1',
		});
	});
});

describe('buildPriceEvent', () => {
	it('combina preço da API com labels resolvidos', () => {
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

		const event = buildPriceEvent(price, {
			Brand: 'Fiat',
			BrandId: '21',
			Model: 'Palio 1.0',
			ModelId: 1234,
			Version: '2015-1',
			VersionId: '2015-1',
			Month: 'julho/2026',
			MonthId: '315',
		});

		expect(event).toEqual({
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
});
