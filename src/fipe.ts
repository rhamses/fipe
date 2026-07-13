import type {
	BrandEntry,
	ModelEntry,
	MonthReference,
	PriceEvent,
	VehicleBrand,
	VehicleModelComplete,
	VehiclePrice,
	VehicleVersion,
	VersionEntry,
} from './types';

export const FIPE_HOST = 'https://veiculos.fipe.org.br/api/veiculos';

export type FetchFn = typeof fetch;

// --- Etapa 1: meses de referência ---

export function extractMonthIds(months: MonthReference[]): string[] {
	return months.map((month) => month.Codigo.toString());
}

export function buildMonthMap(months: MonthReference[]): Map<string, string> {
	const monthMap = new Map<string, string>();
	for (const month of months) {
		monthMap.set(month.Codigo.toString(), month.Mes);
	}
	return monthMap;
}

export async function fetchReferenceMonths(fetchFn: FetchFn = fetch): Promise<MonthReference[]> {
	const response = await fetchFn(`${FIPE_HOST}/ConsultarTabelaDeReferencia`);
	if (!response.ok) {
		throw new Error(`Failed to fetch reference months: ${response.status}`);
	}
	return response.json() as Promise<MonthReference[]>;
}

// --- Etapa 2: marcas ---

export function buildBrandEntries(
	vehicleType: string,
	month: string,
	brands: VehicleBrand[],
): BrandEntry[] {
	return brands.map((brand) => [vehicleType, month, brand.Value]);
}

export function buildBrandMap(brands: VehicleBrand[]): Map<string, string> {
	const brandMap = new Map<string, string>();
	for (const brand of brands) {
		brandMap.set(brand.Value, brand.Label);
	}
	return brandMap;
}

export async function fetchBrands(
	vehicleType: string,
	month: string,
	fetchFn: FetchFn = fetch,
): Promise<VehicleBrand[]> {
	const formData = new FormData();
	formData.append('codigoTipoVeiculo', vehicleType);
	formData.append('codigoTabelaReferencia', month);

	const response = await fetchFn(`${FIPE_HOST}/ConsultarMarcas/`, {
		method: 'POST',
		body: formData,
		redirect: 'follow',
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch brands for month ${month}: ${response.status}`);
	}

	return response.json() as Promise<VehicleBrand[]>;
}

// --- Etapa 3: modelos ---

export function buildModelEntries(
	vehicleType: string,
	month: string,
	brandId: string,
	models: VehicleModelComplete,
): ModelEntry[] {
	return models.Modelos.map((model) => [vehicleType, month, brandId, model.Value]);
}

export function buildModelMap(brandId: string, models: VehicleModelComplete): Map<string, string> {
	const modelMap = new Map<string, string>();
	for (const model of models.Modelos) {
		modelMap.set(`${brandId}_${model.Value}`, model.Label);
	}
	return modelMap;
}

export async function fetchModels(
	vehicleType: string,
	month: string,
	brandId: string,
	fetchFn: FetchFn = fetch,
): Promise<VehicleModelComplete> {
	const formData = new FormData();
	formData.append('codigoTipoVeiculo', vehicleType);
	formData.append('codigoTabelaReferencia', month);
	formData.append('codigoMarca', brandId);

	const response = await fetchFn(`${FIPE_HOST}/ConsultarModelos/`, {
		method: 'POST',
		body: formData,
		redirect: 'follow',
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch models for brand ${brandId}: ${response.status}`);
	}

	return response.json() as Promise<VehicleModelComplete>;
}

// --- Etapa 4: versões (ano/combustível) ---

export function buildVersionEntries(
	vehicleType: string,
	month: string,
	brandId: string,
	modelId: number,
	versions: VehicleVersion[],
): VersionEntry[] {
	return versions.map((version) => [vehicleType, month, brandId, modelId, version.Value]);
}

export function buildVersionMap(
	brandId: string,
	modelId: number,
	versions: VehicleVersion[],
): Map<string, string> {
	const versionMap = new Map<string, string>();
	for (const version of versions) {
		versionMap.set(`${brandId}_${modelId}_${version.Value}`, version.Label);
	}
	return versionMap;
}

export async function fetchVersions(
	vehicleType: string,
	month: string,
	brandId: string,
	modelId: number,
	fetchFn: FetchFn = fetch,
): Promise<VehicleVersion[]> {
	const formData = new FormData();
	formData.append('codigoTipoVeiculo', vehicleType);
	formData.append('codigoTabelaReferencia', month);
	formData.append('codigoMarca', brandId);
	formData.append('codigoModelo', String(modelId));

	const response = await fetchFn(`${FIPE_HOST}/ConsultarAnoModelo/`, {
		method: 'POST',
		body: formData,
		redirect: 'follow',
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch versions for model ${modelId}: ${response.status}`);
	}

	return response.json() as Promise<VehicleVersion[]>;
}

// --- Etapa 5: preços ---

export function parseVersionId(versionId: string): { anoModelo: string; tipoCombustivel: string } {
	const [anoModelo, tipoCombustivel] = versionId.split('-');
	return { anoModelo, tipoCombustivel };
}

export function buildPriceFormData(params: {
	brandId: string;
	modelId: number;
	month: string;
	versionId: string;
	vehicleType: string;
}): FormData {
	const { anoModelo, tipoCombustivel } = parseVersionId(params.versionId);
	const formData = new FormData();
	formData.append('codigoMarca', params.brandId);
	formData.append('codigoModelo', String(params.modelId));
	formData.append('codigoTabelaReferencia', params.month);
	formData.append('codigoTipoCombustivel', tipoCombustivel);
	formData.append('codigoTipoVeiculo', params.vehicleType);
	formData.append('anoModelo', anoModelo);
	formData.append('tipoConsulta', 'tradicional');
	return formData;
}

export function buildPriceEvent(
	price: VehiclePrice,
	lookups: {
		brandMap: Map<string, string>;
		modelMap: Map<string, string>;
		versionMap: Map<string, string>;
		monthMap: Map<string, string>;
		brandId: string;
		modelId: number;
		versionId: string;
		month: string;
	},
): PriceEvent {
	return {
		brand: lookups.brandMap.get(lookups.brandId),
		model: lookups.modelMap.get(`${lookups.brandId}_${lookups.modelId}`),
		version: lookups.versionMap.get(`${lookups.brandId}_${lookups.modelId}_${lookups.versionId}`),
		month: lookups.monthMap.get(lookups.month),
		...price,
	};
}

export async function fetchPrice(
	params: {
		brandId: string;
		modelId: number;
		month: string;
		versionId: string;
		vehicleType: string;
	},
	fetchFn: FetchFn = fetch,
): Promise<VehiclePrice> {
	const formData = buildPriceFormData(params);

	const response = await fetchFn(`${FIPE_HOST}/ConsultarValorComTodosParametros/`, {
		method: 'POST',
		body: formData,
		redirect: 'follow',
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch price for version ${params.versionId}: ${response.status}`);
	}

	return response.json() as Promise<VehiclePrice>;
}
