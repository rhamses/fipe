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

export type VehicleType = string;
export type MonthId = string;
export type BrandId = string;
export type ModelId = number;
export type VersionId = string;

export type BrandTuple = [VehicleType, MonthId, BrandId];
export type ModelTuple = [VehicleType, MonthId, BrandId, ModelId];
export type VersionTuple = [VehicleType, MonthId, BrandId, ModelId, VersionId];

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
