export interface MonthReference {
	Codigo: number;
	Mes: string;
}

export interface VehicleBrand {
	Label: string;
	Value: string;
}

export interface VehicleModel {
	Label: string;
	Value: number;
}

export interface VehicleVersion {
	Label: string;
	Value: string;
}

export interface VehicleModelComplete {
	Modelos: VehicleModel[];
	Anos: VehicleVersion[];
}

export interface VehiclePrice {
	Valor: string;
	Marca: string;
	Modelo: string;
	AnoModelo: number;
	Combustivel: string;
	CodigoFipe: string;
	MesReferencia: string;
	Autenticacao: string;
	TipoVeiculo: number;
	SiglaCombustivel: string;
	DataConsulta: string;
}

export type BrandEntry = [vehicleType: string, month: string, brandId: string];
export type ModelEntry = [vehicleType: string, month: string, brandId: string, modelId: number];
export type VersionEntry = [vehicleType: string, month: string, brandId: string, modelId: number, versionId: string];

export interface PriceEvent extends VehiclePrice {
	Brand?: string;
	BrandId?: string;
	Model?: string;
	ModelId?: number;
	Version?: string;
	VersionId?: string;
	Month?: string;
	MonthId?: string;
}
