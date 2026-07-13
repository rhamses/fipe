INSERT INTO brand_sink
	SELECT
		"BrandId" AS brand_id,
		"Brand" AS brand_name,
		"TipoVeiculo" AS vehicle_id
	FROM fipe_pipeline_stream;

INSERT INTO model_sink
	SELECT
		"BrandId" AS brand_id,
		"ModelId" AS model_id,
		"TipoVeiculo" AS vehicle_id,
		"Model" AS model_name
	FROM fipe_pipeline_stream;

INSERT INTO variation_sink
	SELECT
		"BrandId" AS brand_id,
		"ModelId" AS model_id,
		"VersionId" AS version_id,
		"TipoVeiculo" AS vehicle_id,
		"Version" AS version_name,
		"AnoModelo" AS year_model,
		"Combustivel" AS fuel
	FROM fipe_pipeline_stream;

INSERT INTO price_sink
	SELECT
		"BrandId" AS brand_id,
		"ModelId" AS model_id,
		"VersionId" AS version_id,
		"MonthId" AS month_id,
		"TipoVeiculo" AS vehicle_id,
		"Valor" AS price,
		"DataConsulta" AS data_consulta,
		"Autenticacao" AS authentication,
		"CodigoFipe" AS fipe_code
	FROM fipe_pipeline_stream;

INSERT INTO month_sink
	SELECT
		"MonthId" AS month_id,
		"MesReferencia" AS month_name
	FROM fipe_pipeline_stream;
