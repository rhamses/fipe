import type {
	BrandTuple,
	MonthReference,
	ModelTuple,
	PriceEvent,
	VehicleBrand,
	VehicleModelComplete,
	VehiclePrice,
	VehicleVersion,
	VersionTuple,
} from './types';

export function parseReferenceMonths(months: MonthReference[]) {
	const monthMap = new Map<string, string>();
	const monthIds = months.map((month) => {
		const id = month.Codigo.toString();
		monthMap.set(id, month.Mes);
		return id;
	});
	return { monthIds, monthMap };
}

export function parseBrands(
	vehicleType: string,
	monthId: string,
	brands: VehicleBrand[],
): { brandTuples: BrandTuple[]; brandMap: Map<string, string> } {
	const brandMap = new Map<string, string>();
	const brandTuples = brands.map((brand) => {
		brandMap.set(brand.Value, brand.Label);
		return [vehicleType, monthId, brand.Value] as BrandTuple;
	});
	return { brandTuples, brandMap };
}

export function parseModels(
	vehicleType: string,
	monthId: string,
	brandId: string,
	data: VehicleModelComplete,
): { modelTuples: ModelTuple[]; modelMap: Map<string, string> } {
	const modelMap = new Map<string, string>();
	const modelTuples = data.Modelos.map((model) => {
		modelMap.set(`${brandId}_${model.Value}`, model.Label);
		return [vehicleType, monthId, brandId, model.Value] as ModelTuple;
	});
	return { modelTuples, modelMap };
}

export function parseVersions(
	vehicleType: string,
	monthId: string,
	brandId: string,
	modelId: number,
	versions: VehicleVersion[],
): { versionTuples: VersionTuple[]; versionMap: Map<string, string> } {
	const versionMap = new Map<string, string>();
	const versionTuples = versions.map((version) => {
		versionMap.set(`${brandId}_${modelId}_${version.Value}`, version.Label);
		return [vehicleType, monthId, brandId, modelId, version.Value] as VersionTuple;
	});
	return { versionTuples, versionMap };
}

export function parseVersionId(versionId: string) {
	const [anoModelo, tipoFuel] = versionId.split('-');
	return { anoModelo, tipoFuel };
}

export function buildPriceEvent(
	price: VehiclePrice,
	fields: {
		Brand?: string;
		BrandId?: string;
		Model?: string;
		ModelId?: number;
		Version?: string;
		VersionId?: string;
		Month?: string;
		MonthId?: string;
	},
): PriceEvent {
	return {
		Brand: fields.Brand,
		BrandId: fields.BrandId,
		Model: fields.Model,
		ModelId: fields.ModelId,
		Version: fields.Version,
		VersionId: fields.VersionId,
		Month: fields.Month,
		MonthId: fields.MonthId,
		...price,
	};
}
