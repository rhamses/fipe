import { describe, expect, it } from 'vitest';
import {
	FIPE_HOST,
	fetchBrands,
	fetchModels,
	fetchPrice,
	fetchReferenceMonths,
	fetchVersions,
} from '../../src/fipe/client';

const VEHICLE_TYPE = '1';

describe('FIPE API (integração)', () => {
	it('ConsultarTabelaDeReferencia retorna meses válidos', async () => {
		const { monthIds, monthMap } = await fetchReferenceMonths(fetch);

		expect(monthIds.length).toBeGreaterThan(0);
		expect(monthIds[0]).toMatch(/^\d+$/);
		expect(monthMap.get(monthIds[0])).toBeTruthy();
	});

	it('cadeia marcas → modelos → versões → preço responde 200 com dados', async () => {
		const { monthIds } = await fetchReferenceMonths(fetch);
		const monthId = monthIds[0];
		expect(monthId).toBeDefined();

		const brands = await fetchBrands(fetch, VEHICLE_TYPE, monthId);
		expect(brands).not.toBeNull();
		expect(brands!.brandTuples.length).toBeGreaterThan(0);

		const [, , brandId] = brands!.brandTuples[0];
		const models = await fetchModels(fetch, VEHICLE_TYPE, monthId, brandId);
		expect(models).not.toBeNull();
		expect(models!.modelTuples.length).toBeGreaterThan(0);

		const [, , , modelId] = models!.modelTuples[0];
		const versions = await fetchVersions(fetch, VEHICLE_TYPE, monthId, brandId, modelId);
		expect(versions).not.toBeNull();
		expect(versions!.versionTuples.length).toBeGreaterThan(0);

		const [, , , , versionId] = versions!.versionTuples[0];
		const price = await fetchPrice(fetch, {
			vehicleType: VEHICLE_TYPE,
			monthId,
			brandId,
			modelId,
			versionId,
		});

		expect(price).not.toBeNull();
		expect(price!.Valor).toMatch(/R\$/);
		expect(price!.CodigoFipe).toBeTruthy();
		expect(price!.Marca).toBeTruthy();
		expect(price!.Modelo).toBeTruthy();
		expect(typeof price!.AnoModelo).toBe('number');
	}, 30_000);

	it('exposes endpoints sob o host FIPE esperado', () => {
		expect(FIPE_HOST).toBe('https://veiculos.fipe.org.br/api/veiculos');
	});
});
