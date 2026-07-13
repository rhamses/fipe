import {
	buildPriceEvent,
	parseBrands,
	parseModels,
	parseReferenceMonths,
	parseVersionId,
	parseVersions,
} from './parsers';
import type {
	BrandTuple,
	ModelTuple,
	MonthReference,
	PriceEvent,
	VehicleBrand,
	VehicleModelComplete,
	VehiclePrice,
	VehicleVersion,
	VersionTuple,
} from './types';

export const FIPE_HOST = 'https://veiculos.fipe.org.br/api/veiculos';

type FetchFn = typeof fetch;

const FIPE_HEADERS = {
	Accept: 'application/json, text/javascript, */*; q=0.01',
	'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
	Origin: 'https://veiculos.fipe.org.br',
	Referer: 'https://veiculos.fipe.org.br/',
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest',
} as const;

async function postForm(fetchFn: FetchFn, url: string, fields: Record<string, string>) {
	return fetchFn(url, {
		method: 'POST',
		headers: {
			...FIPE_HEADERS,
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		},
		body: new URLSearchParams(fields),
		redirect: 'follow',
	});
}

async function postEmpty(fetchFn: FetchFn, url: string) {
	// FIPE (IIS) requires Content-Length; an empty body ensures the header is sent.
	return fetchFn(url, {
		method: 'POST',
		headers: {
			...FIPE_HEADERS,
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		},
		body: '',
		redirect: 'follow',
	});
}

export async function fetchReferenceMonths(fetchFn: FetchFn) {
	const response = await postEmpty(fetchFn, `${FIPE_HOST}/ConsultarTabelaDeReferencia`);
	if (!response.ok) {
		const body = (await response.text()).slice(0, 300);
		throw new Error(
			`Failed to fetch reference months: ${response.status} ${response.headers.get('content-type') ?? ''} ${body}`,
		);
	}
	const months = (await response.json()) as MonthReference[];
	return parseReferenceMonths(months);
}

export async function fetchBrands(
	fetchFn: FetchFn,
	vehicleType: string,
	monthId: string,
): Promise<{ brandTuples: BrandTuple[]; brandMap: Map<string, string> } | null> {
	const response = await postForm(fetchFn, `${FIPE_HOST}/ConsultarMarcas/`, {
		codigoTipoVeiculo: vehicleType,
		codigoTabelaReferencia: monthId,
	});
	if (!response.ok) {
		return null;
	}
	const brands = (await response.json()) as VehicleBrand[];
	return parseBrands(vehicleType, monthId, brands);
}

export async function fetchModels(
	fetchFn: FetchFn,
	vehicleType: string,
	monthId: string,
	brandId: string,
): Promise<{ modelTuples: ModelTuple[]; modelMap: Map<string, string> } | null> {
	const response = await postForm(fetchFn, `${FIPE_HOST}/ConsultarModelos/`, {
		codigoTipoVeiculo: vehicleType,
		codigoTabelaReferencia: monthId,
		codigoMarca: brandId,
	});
	if (!response.ok) {
		return null;
	}
	const data = (await response.json()) as VehicleModelComplete;
	return parseModels(vehicleType, monthId, brandId, data);
}

export async function fetchVersions(
	fetchFn: FetchFn,
	vehicleType: string,
	monthId: string,
	brandId: string,
	modelId: number,
): Promise<{ versionTuples: VersionTuple[]; versionMap: Map<string, string> } | null> {
	const response = await postForm(fetchFn, `${FIPE_HOST}/ConsultarAnoModelo/`, {
		codigoTipoVeiculo: vehicleType,
		codigoTabelaReferencia: monthId,
		codigoMarca: brandId,
		codigoModelo: modelId.toString(),
	});
	if (!response.ok) {
		return null;
	}
	const versions = (await response.json()) as VehicleVersion[];
	return parseVersions(vehicleType, monthId, brandId, modelId, versions);
}

export async function fetchPrice(
	fetchFn: FetchFn,
	params: {
		vehicleType: string;
		monthId: string;
		brandId: string;
		modelId: number;
		versionId: string;
	},
): Promise<VehiclePrice | null> {
	const { anoModelo, tipoFuel } = parseVersionId(params.versionId);
	const response = await postForm(fetchFn, `${FIPE_HOST}/ConsultarValorComTodosParametros/`, {
		codigoMarca: params.brandId,
		codigoModelo: params.modelId.toString(),
		codigoTabelaReferencia: params.monthId,
		codigoTipoCombustivel: tipoFuel,
		codigoTipoVeiculo: params.vehicleType,
		anoModelo,
		tipoConsulta: 'tradicional',
	});
	if (!response.ok) {
		return null;
	}
	return (await response.json()) as VehiclePrice;
}

export async function fetchPriceEvent(
	fetchFn: FetchFn,
	version: VersionTuple,
	maps: {
		brandMap: Map<string, string>;
		modelMap: Map<string, string>;
		versionMap: Map<string, string>;
		monthMap: Map<string, string>;
	},
): Promise<PriceEvent | null> {
	const [vehicleType, monthId, brandId, modelId, versionId] = version;
	const price = await fetchPrice(fetchFn, {
		vehicleType,
		monthId,
		brandId,
		modelId,
		versionId,
	});
	if (!price) {
		return null;
	}
	return buildPriceEvent(price, {
		Brand: maps.brandMap.get(brandId),
		BrandId: brandId,
		Model: maps.modelMap.get(`${brandId}_${modelId}`),
		ModelId: modelId,
		Version: versionId,
		VersionId: versionId,
		Month: maps.monthMap.get(monthId),
		MonthId: monthId,
	});
}
