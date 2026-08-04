import { getCatalogEnv } from './env';
import { queryR2Sql } from './r2-sql';
import { buildStatsAudit, type AuditEntry } from './stats-audit';

export const VEHICLE_LABELS: Record<number, string> = {
	1: 'Carros',
	2: 'Motos',
	3: 'Caminhões',
};
export const VEHICLE_IDS = [1, 2, 3] as const;

export const PRICE_RANGES = [
	'20-50k',
	'50-80k',
	'80-120k',
	'120-200k',
	'200-300k',
	'300k+',
] as const;

export const DEPRECIATION_AGES = [0, 1, 2, 3] as const;
export const DEPRECIATION_LABELS = ['0km', '1 ano', '2 anos', '3 anos'];
export const RELATIVE_AGES = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export const RELATIVE_LABELS = [
	'3 anos',
	'4 anos',
	'5 anos',
	'6 anos',
	'7 anos',
	'8 anos',
	'9 anos',
	'10 anos',
];
export const LONGEVITY_BANDS = ['0-1a', '1-3a', '3-5a', '5-10a', '10a+'] as const;
export const DEP_PRICE_BANDS = ['ate-80k', '80-150k', '150k+'] as const;
export const DEP_PRICE_BAND_LABELS: Record<(typeof DEP_PRICE_BANDS)[number], string> = {
	'ate-80k': 'Até 80k',
	'80-150k': '80–150k',
	'150k+': '150k+',
};

export type ChartDataset = { label: string; values: number[] };

export type VehicleStat = {
	id: number;
	label: string;
	marcas: number;
	modelos: number;
	precos: number;
	maiorPreco: number;
	menorPreco: number;
};

export type ExtremeVehicle = {
	id: number;
	label: string;
	brand: string;
	model: string;
	yearModel: string;
	price: number;
	fipeCode: string;
};

export type ConcentrationStat = {
	id: number;
	label: string;
	top5Share: number;
	hhi: number;
	topBrand: string;
	topBrandShare: number;
};

export type PieByVehicle = {
	id: number;
	label: string;
	labels: string[];
	values: number[];
};

export type StatsPageData = {
	error: string | null;
	recentTabLabel: string;
	sinceTabLabel: string;
	recentVehicleStats: VehicleStat[];
	sinceVehicleStats: VehicleStat[];
	brandsByYearLabels: string[];
	brandsByYearValues: number[];
	modelsVariationsLabels: string[];
	modelsVariationsDatasets: ChartDataset[];
	priceRangeByVehicle: PieByVehicle[];
	depreciationDatasets: ChartDataset[];
	relativeDepreciationDatasets: ChartDataset[];
	medianLabels: string[];
	medianDatasets: ChartDataset[];
	meanDatasets: ChartDataset[];
	momLabels: string[];
	momDatasets: ChartDataset[];
	topBrandsByVehicle: Array<{
		id: number;
		label: string;
		labels: string[];
		values: number[];
	}>;
	topBrandModelsByVehicle: Array<{
		id: number;
		label: string;
		labels: string[];
		datasets: ChartDataset[];
	}>;
	zeroKmLabels: string[];
	zeroKmDatasets: ChartDataset[];
	fleetAgeLabels: string[];
	fleetAgeDatasets: ChartDataset[];
	concentration: ConcentrationStat[];
	churnLabels: string[];
	churnDatasets: ChartDataset[];
	inflationLabels: string[];
	inflationDatasets: ChartDataset[];
	depByBandDatasets: ChartDataset[];
	depByBandRelativeDatasets: ChartDataset[];
	extremesMax: ExtremeVehicle[];
	extremesMin: ExtremeVehicle[];
	longevityByVehicle: PieByVehicle[];
	auditTrail: AuditEntry[];
};

type VehicleStatsRow = {
	vehicle_id: number;
	vehicle_text: string;
	marcas: number;
	modelos: number;
	precos: number;
	maior_preco: number;
	menor_preco: number;
};

type PeriodRow = {
	month_name: string;
	month_year: string;
	month_name_int: number;
};

type BrandsByYearRow = { month_year: string; marcas: number };
type ModelsVariationsByYearRow = {
	month_year: string;
	modelos: number;
	variacoes: number;
};
type PriceRangeRow = {
	vehicle_id: number;
	vehicle_text: string;
	faixa: string;
	total: number;
};
type DepreciationRow = {
	vehicle_id: number;
	age_years: number;
	pct_retained: number;
	samples: number;
};
type RelativeDepreciationRow = {
	vehicle_id: number;
	age_years: number;
	pct_relative: number;
	samples: number;
};
type PriceByYearRow = {
	vehicle_id: number;
	month_year: string;
	mediana: number;
	media: number;
};
type MonthlyCatalogRow = {
	month_year: string;
	m: number;
	marcas: number;
	modelos: number;
	precos: number;
};
type BrandCountRow = {
	vehicle_id: number;
	brand_name: string;
	codes: number;
};
type BrandModelsRow = {
	vehicle_id: number;
	brand_name: string;
	modelos: number;
	variacoes: number;
};
type ZeroKmRow = {
	month_year: string;
	vehicle_id: number;
	zero_km: number;
	usados: number;
};
type FleetAgeRow = {
	month_year: string;
	vehicle_id: number;
	idade_media: number;
};
type YearlyChurnRow = {
	y: number;
	vehicle_id: number;
	modelos: number;
	entradas: number;
};
type InflationRow = {
	vehicle_id: number;
	y: number;
	avg_price: number;
	n: number;
};
type DepBandRow = {
	faixa: string;
	age_years: number;
	pct_retained: number;
	samples: number;
};
type ExtremeRow = {
	vehicle_id: number;
	brand_name: string;
	model_name: string;
	year_model: number;
	price_value: number;
	fipe_code: string;
};
type LongevityRow = { vehicle_id: number; faixa: string; total: number };

const emptyData = (): StatsPageData => ({
	error: null,
	recentTabLabel: 'Mês mais recente',
	sinceTabLabel: 'Desde',
	recentVehicleStats: [],
	sinceVehicleStats: [],
	brandsByYearLabels: [],
	brandsByYearValues: [],
	modelsVariationsLabels: [],
	modelsVariationsDatasets: [],
	priceRangeByVehicle: [],
	depreciationDatasets: [],
	relativeDepreciationDatasets: [],
	medianLabels: [],
	medianDatasets: [],
	meanDatasets: [],
	momLabels: [],
	momDatasets: [],
	topBrandsByVehicle: [],
	topBrandModelsByVehicle: [],
	zeroKmLabels: [],
	zeroKmDatasets: [],
	fleetAgeLabels: [],
	fleetAgeDatasets: [],
	concentration: [],
	churnLabels: [],
	churnDatasets: [],
	inflationLabels: [],
	inflationDatasets: [],
	depByBandDatasets: [],
	depByBandRelativeDatasets: [],
	extremesMax: [],
	extremesMin: [],
	longevityByVehicle: [],
	auditTrail: [],
});

const mapVehicleStats = (rows: VehicleStatsRow[]): VehicleStat[] => {
	const byId = new Map(rows.map((row) => [Number(row.vehicle_id), row]));
	return VEHICLE_IDS.map((id) => {
		const row = byId.get(id);
		return {
			id,
			label: VEHICLE_LABELS[id] ?? row?.vehicle_text ?? String(id),
			marcas: Number(row?.marcas ?? 0),
			modelos: Number(row?.modelos ?? 0),
			precos: Number(row?.precos ?? 0),
			maiorPreco: Number(row?.maior_preco ?? 0),
			menorPreco: Number(row?.menor_preco ?? 0),
		};
	});
};

const formatRelativeLegend = (from: number, to: number, name: string) => {
	const delta = Number((to - from).toFixed(1));
	const deltaLabel = delta < 0 ? `-%${Math.abs(delta)}` : delta > 0 ? `+%${delta}` : '%0';
	return `${name} ${deltaLabel}`;
};

const formatYearModel = (year: number) => (year === 32000 ? '0km' : String(year));

const vehicleStatsQuery = (year: string, monthInt: number) => `
	SELECT
		vehicle_id,
		vehicle_text,
		COUNT(DISTINCT brand_name) AS marcas,
		COUNT(DISTINCT model_id) AS modelos,
		COUNT(*) AS precos,
		MAX(price_value) AS maior_preco,
		MIN(price_value) AS menor_preco
	FROM silver.precos
	WHERE month_year = '${year}'
		AND month_name_int = ${monthInt}
		AND price_value IS NOT NULL
		AND price_value > 0
	GROUP BY vehicle_id, vehicle_text
	ORDER BY vehicle_id
`;

const allTimeVehicleStatsQuery = `
	SELECT
		vehicle_id,
		vehicle_text,
		COUNT(DISTINCT brand_name) AS marcas,
		COUNT(DISTINCT model_id) AS modelos,
		COUNT(*) AS precos,
		MAX(price_value) AS maior_preco,
		MIN(price_value) AS menor_preco
	FROM silver.precos
	WHERE month_name != 'x'
		AND month_year IS NOT NULL
		AND price_value IS NOT NULL
		AND price_value > 0
	GROUP BY vehicle_id, vehicle_text
	ORDER BY vehicle_id
`;

const extremeQuery = (year: string, monthInt: number, vehicleId: number, desc: boolean) => `
	SELECT vehicle_id, brand_name, model_name, year_model, price_value, fipe_code
	FROM silver.precos
	WHERE month_year = '${year}'
		AND month_name_int = ${monthInt}
		AND vehicle_id = ${vehicleId}
		AND price_value IS NOT NULL
		AND price_value > 0
	ORDER BY price_value ${desc ? 'DESC' : 'ASC'}
	LIMIT 1
`;

const seriesByVehicleYear = <T extends { vehicle_id: number; month_year: string }>(
	rows: T[],
	years: string[],
	pick: (row: T | undefined) => number,
): ChartDataset[] =>
	VEHICLE_IDS.map((id) => {
		const byYear = new Map(
			rows.filter((row) => Number(row.vehicle_id) === id).map((row) => [row.month_year, row]),
		);
		return {
			label: VEHICLE_LABELS[id]!,
			values: years.map((year) => pick(byYear.get(year))),
		};
	});

export async function loadStatsPageData(): Promise<StatsPageData> {
	const data = emptyData();

	try {
		getCatalogEnv();

		const [
			lastMonthResult,
			firstMonthResult,
			brandsByYearResult,
			modelsVariationsResult,
			priceRangeResult,
			depreciationResult,
			relativeDepreciationResult,
			priceByYearResult,
			monthlyCatalogResult,
			zeroKmResult,
			fleetAgeResult,
			yearlyChurnResult,
			inflationResult,
			depByBandResult,
			depByBandRelativeResult,
			longevityResult,
		] = await Promise.all([
			queryR2Sql<PeriodRow>(`
				SELECT month_name, month_year, month_name_int
				FROM silver.precos
				WHERE month_name != 'x' AND month_year IS NOT NULL
				GROUP BY month_id, month_name, month_year, month_name_int
				ORDER BY CAST(month_year AS INT) DESC, month_name_int DESC
				LIMIT 1
			`),
			queryR2Sql<PeriodRow>(`
				SELECT month_name, month_year, month_name_int
				FROM silver.precos
				WHERE month_name != 'x' AND month_year IS NOT NULL
				GROUP BY month_id, month_name, month_year, month_name_int
				ORDER BY CAST(month_year AS INT) ASC, month_name_int ASC
				LIMIT 1
			`),
			queryR2Sql<BrandsByYearRow>(`
				SELECT month_year, COUNT(DISTINCT brand_name) AS marcas
				FROM silver.precos
				WHERE month_name != 'x' AND month_year IS NOT NULL
				GROUP BY month_year
				ORDER BY month_year ASC
			`),
			queryR2Sql<ModelsVariationsByYearRow>(`
				SELECT
					month_year,
					COUNT(DISTINCT model_id) AS modelos,
					COUNT(DISTINCT CONCAT(CAST(model_id AS TEXT), '-', version_id)) AS variacoes
				FROM silver.precos
				WHERE month_name != 'x' AND month_year IS NOT NULL
				GROUP BY month_year
				ORDER BY month_year ASC
			`),
			queryR2Sql<PriceRangeRow>(`
				SELECT
					vehicle_id,
					vehicle_text,
					CASE
						WHEN price_value >= 20000 AND price_value < 50000 THEN '20-50k'
						WHEN price_value >= 50000 AND price_value < 80000 THEN '50-80k'
						WHEN price_value >= 80000 AND price_value < 120000 THEN '80-120k'
						WHEN price_value >= 120000 AND price_value < 200000 THEN '120-200k'
						WHEN price_value >= 200000 AND price_value < 300000 THEN '200-300k'
						WHEN price_value >= 300000 THEN '300k+'
					END AS faixa,
					COUNT(*) AS total
				FROM silver.precos
				WHERE price_value IS NOT NULL AND price_value >= 20000
				GROUP BY vehicle_id, vehicle_text, faixa
				ORDER BY vehicle_id, faixa
			`),
			queryR2Sql<DepreciationRow>(`
				WITH zero_km AS (
					SELECT
						fipe_code, vehicle_id,
						CAST(month_year AS INT) AS y,
						CAST(month_name_int AS INT) AS m,
						price_value AS price_0km,
						CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS ym
					FROM silver.precos
					WHERE year_model = 32000 AND price_value IS NOT NULL AND price_value > 0
				),
				first_zero AS (
					SELECT fipe_code, vehicle_id, MIN(ym) AS first_ym
					FROM zero_km GROUP BY fipe_code, vehicle_id
				),
				launch AS (
					SELECT z.fipe_code, z.vehicle_id, z.y AS launch_year, z.m AS launch_month, z.price_0km
					FROM zero_km z
					INNER JOIN first_zero f
						ON z.fipe_code = f.fipe_code AND z.vehicle_id = f.vehicle_id AND z.ym = f.first_ym
				),
				paired AS (
					SELECT
						l.vehicle_id,
						CAST(u.month_year AS INT) - l.launch_year AS age_years,
						u.price_value / l.price_0km * 100.0 AS pct_retained
					FROM launch l
					INNER JOIN silver.precos u
						ON u.fipe_code = l.fipe_code
						AND u.vehicle_id = l.vehicle_id
						AND u.year_model = l.launch_year
						AND CAST(u.month_name_int AS INT) = l.launch_month
						AND u.price_value IS NOT NULL AND u.price_value > 0
					WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 1 AND 3
				)
				SELECT vehicle_id, age_years, AVG(pct_retained) AS pct_retained, COUNT(*) AS samples
				FROM paired GROUP BY vehicle_id, age_years
				ORDER BY vehicle_id, age_years
			`),
			queryR2Sql<RelativeDepreciationRow>(`
				WITH zero_km AS (
					SELECT
						fipe_code, vehicle_id,
						CAST(month_year AS INT) AS y,
						CAST(month_name_int AS INT) AS m,
						price_value AS price_0km,
						CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS ym
					FROM silver.precos
					WHERE year_model = 32000 AND price_value IS NOT NULL AND price_value > 0
				),
				first_zero AS (
					SELECT fipe_code, vehicle_id, MIN(ym) AS first_ym
					FROM zero_km GROUP BY fipe_code, vehicle_id
				),
				launch AS (
					SELECT z.fipe_code, z.vehicle_id, z.y AS launch_year, z.m AS launch_month, z.price_0km
					FROM zero_km z
					INNER JOIN first_zero f
						ON z.fipe_code = f.fipe_code AND z.vehicle_id = f.vehicle_id AND z.ym = f.first_ym
				),
				paired AS (
					SELECT
						l.vehicle_id, l.fipe_code,
						CAST(u.month_year AS INT) - l.launch_year AS age_years,
						u.price_value
					FROM launch l
					INNER JOIN silver.precos u
						ON u.fipe_code = l.fipe_code
						AND u.vehicle_id = l.vehicle_id
						AND u.year_model = l.launch_year
						AND CAST(u.month_name_int AS INT) = l.launch_month
						AND u.price_value IS NOT NULL AND u.price_value > 0
					WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 3 AND 10
				),
				at3 AS (
					SELECT vehicle_id, fipe_code, price_value AS price_3yr
					FROM paired WHERE age_years = 3
				)
				SELECT
					p.vehicle_id, p.age_years,
					AVG(p.price_value / a.price_3yr * 100.0) AS pct_relative,
					COUNT(*) AS samples
				FROM paired p
				INNER JOIN at3 a ON p.fipe_code = a.fipe_code AND p.vehicle_id = a.vehicle_id
				GROUP BY p.vehicle_id, p.age_years
				ORDER BY p.vehicle_id, p.age_years
			`),
			queryR2Sql<PriceByYearRow>(`
				SELECT
					vehicle_id,
					month_year,
					approx_median(price_value) AS mediana,
					AVG(price_value) AS media
				FROM silver.precos
				WHERE month_name != 'x' AND month_year IS NOT NULL AND price_value > 0
				GROUP BY vehicle_id, month_year
				ORDER BY month_year ASC, vehicle_id ASC
			`),
			queryR2Sql<MonthlyCatalogRow>(`
				SELECT
					month_year,
					CAST(month_name_int AS INT) AS m,
					COUNT(DISTINCT brand_name) AS marcas,
					COUNT(DISTINCT model_id) AS modelos,
					COUNT(*) AS precos
				FROM silver.precos
				WHERE month_name != 'x' AND month_year IS NOT NULL
				GROUP BY month_year, month_name_int
				ORDER BY CAST(month_year AS INT), month_name_int
			`),
			queryR2Sql<ZeroKmRow>(`
				SELECT
					month_year,
					vehicle_id,
					SUM(CASE WHEN year_model = 32000 THEN 1 ELSE 0 END) AS zero_km,
					SUM(CASE WHEN year_model != 32000 THEN 1 ELSE 0 END) AS usados
				FROM silver.precos
				WHERE month_name != 'x' AND month_year IS NOT NULL
				GROUP BY month_year, vehicle_id
				ORDER BY month_year ASC, vehicle_id ASC
			`),
			queryR2Sql<FleetAgeRow>(`
				SELECT
					month_year,
					vehicle_id,
					AVG(CAST(month_year AS INT) - year_model) AS idade_media
				FROM silver.precos
				WHERE month_name != 'x'
					AND year_model IS NOT NULL
					AND year_model != 32000
					AND year_model > 1980
					AND CAST(month_year AS INT) >= year_model
				GROUP BY month_year, vehicle_id
				ORDER BY month_year ASC, vehicle_id ASC
			`),
			queryR2Sql<YearlyChurnRow>(`
				WITH yearly_models AS (
					SELECT CAST(month_year AS INT) AS y, vehicle_id, model_id
					FROM silver.precos
					WHERE month_name != 'x' AND month_year IS NOT NULL
					GROUP BY CAST(month_year AS INT), vehicle_id, model_id
				)
				SELECT
					a.y,
					a.vehicle_id,
					COUNT(*) AS modelos,
					SUM(CASE WHEN b.model_id IS NULL THEN 1 ELSE 0 END) AS entradas
				FROM yearly_models a
				LEFT JOIN yearly_models b
					ON a.vehicle_id = b.vehicle_id
					AND a.model_id = b.model_id
					AND b.y = a.y - 1
				GROUP BY a.y, a.vehicle_id
				ORDER BY a.y, a.vehicle_id
			`),
			queryR2Sql<InflationRow>(`
				WITH first_years AS (
					SELECT vehicle_id, MIN(CAST(month_year AS INT)) AS first_y
					FROM silver.precos
					WHERE month_name != 'x' AND month_year IS NOT NULL
					GROUP BY vehicle_id
				),
				last_period AS (
					SELECT
						CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS last_ym
					FROM silver.precos
					WHERE month_name != 'x' AND month_year IS NOT NULL
					GROUP BY month_id, month_name, month_year, month_name_int
					ORDER BY CAST(month_year AS INT) DESC, month_name_int DESC
					LIMIT 1
				),
				panel AS (
					SELECT s.fipe_code, s.vehicle_id, f.first_y
					FROM silver.precos s
					INNER JOIN first_years f ON s.vehicle_id = f.vehicle_id
					CROSS JOIN last_period l
					WHERE s.month_name != 'x' AND s.price_value > 0
					GROUP BY s.fipe_code, s.vehicle_id, f.first_y, l.last_ym
					HAVING MIN(CAST(s.month_year AS INT)) <= f.first_y
						AND MAX(CAST(s.month_year AS INT) * 100 + CAST(s.month_name_int AS INT)) >= l.last_ym
				),
				yearly AS (
					SELECT
						p.vehicle_id,
						CAST(s.month_year AS INT) AS y,
						AVG(s.price_value) AS avg_price,
						COUNT(*) AS n
					FROM silver.precos s
					INNER JOIN panel p
						ON s.fipe_code = p.fipe_code AND s.vehicle_id = p.vehicle_id
					WHERE s.month_name != 'x'
						AND s.price_value > 0
						AND CAST(s.month_year AS INT) >= p.first_y
					GROUP BY p.vehicle_id, CAST(s.month_year AS INT)
				)
				SELECT * FROM yearly ORDER BY y, vehicle_id
			`),
			queryR2Sql<DepBandRow>(`
				WITH zero_km AS (
					SELECT
						fipe_code, vehicle_id,
						CAST(month_year AS INT) AS y,
						CAST(month_name_int AS INT) AS m,
						price_value AS price_0km,
						CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS ym,
						CASE
							WHEN price_value < 80000 THEN 'ate-80k'
							WHEN price_value < 150000 THEN '80-150k'
							ELSE '150k+'
						END AS faixa
					FROM silver.precos
					WHERE year_model = 32000
						AND price_value IS NOT NULL
						AND price_value > 0
						AND vehicle_id = 1
				),
				first_zero AS (
					SELECT fipe_code, vehicle_id, MIN(ym) AS first_ym
					FROM zero_km GROUP BY fipe_code, vehicle_id
				),
				launch AS (
					SELECT z.fipe_code, z.vehicle_id, z.y AS launch_year, z.m AS launch_month, z.price_0km, z.faixa
					FROM zero_km z
					INNER JOIN first_zero f
						ON z.fipe_code = f.fipe_code AND z.vehicle_id = f.vehicle_id AND z.ym = f.first_ym
				),
				paired AS (
					SELECT
						l.faixa,
						CAST(u.month_year AS INT) - l.launch_year AS age_years,
						u.price_value / l.price_0km * 100.0 AS pct_retained
					FROM launch l
					INNER JOIN silver.precos u
						ON u.fipe_code = l.fipe_code
						AND u.vehicle_id = l.vehicle_id
						AND u.year_model = l.launch_year
						AND CAST(u.month_name_int AS INT) = l.launch_month
						AND u.price_value > 0
					WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 1 AND 3
				)
				SELECT faixa, age_years, AVG(pct_retained) AS pct_retained, COUNT(*) AS samples
				FROM paired GROUP BY faixa, age_years
				ORDER BY faixa, age_years
			`),
			queryR2Sql<DepBandRow>(`
				WITH zero_km AS (
					SELECT
						fipe_code, vehicle_id,
						CAST(month_year AS INT) AS y,
						CAST(month_name_int AS INT) AS m,
						price_value AS price_0km,
						CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS ym,
						CASE
							WHEN price_value < 80000 THEN 'ate-80k'
							WHEN price_value < 150000 THEN '80-150k'
							ELSE '150k+'
						END AS faixa
					FROM silver.precos
					WHERE year_model = 32000
						AND price_value IS NOT NULL
						AND price_value > 0
						AND vehicle_id = 1
				),
				first_zero AS (
					SELECT fipe_code, vehicle_id, MIN(ym) AS first_ym
					FROM zero_km GROUP BY fipe_code, vehicle_id
				),
				launch AS (
					SELECT z.fipe_code, z.vehicle_id, z.y AS launch_year, z.m AS launch_month, z.price_0km, z.faixa
					FROM zero_km z
					INNER JOIN first_zero f
						ON z.fipe_code = f.fipe_code AND z.vehicle_id = f.vehicle_id AND z.ym = f.first_ym
				),
				paired AS (
					SELECT
						l.faixa,
						l.fipe_code,
						CAST(u.month_year AS INT) - l.launch_year AS age_years,
						u.price_value
					FROM launch l
					INNER JOIN silver.precos u
						ON u.fipe_code = l.fipe_code
						AND u.vehicle_id = l.vehicle_id
						AND u.year_model = l.launch_year
						AND CAST(u.month_name_int AS INT) = l.launch_month
						AND u.price_value > 0
					WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 3 AND 10
				),
				at3 AS (
					SELECT faixa, fipe_code, price_value AS price_3yr
					FROM paired
					WHERE age_years = 3
				)
				SELECT
					p.faixa,
					p.age_years,
					AVG(p.price_value / a.price_3yr * 100.0) AS pct_retained,
					COUNT(*) AS samples
				FROM paired p
				INNER JOIN at3 a
					ON p.fipe_code = a.fipe_code AND p.faixa = a.faixa
				GROUP BY p.faixa, p.age_years
				ORDER BY p.faixa, p.age_years
			`),
			queryR2Sql<LongevityRow>(`
				SELECT
					vehicle_id,
					CASE
						WHEN months <= 12 THEN '0-1a'
						WHEN months <= 36 THEN '1-3a'
						WHEN months <= 60 THEN '3-5a'
						WHEN months <= 120 THEN '5-10a'
						ELSE '10a+'
					END AS faixa,
					COUNT(*) AS total
				FROM (
					SELECT vehicle_id, fipe_code, COUNT(DISTINCT month_id) AS months
					FROM silver.precos
					WHERE month_name != 'x'
					GROUP BY vehicle_id, fipe_code
				) t
				GROUP BY
					vehicle_id,
					CASE
						WHEN months <= 12 THEN '0-1a'
						WHEN months <= 36 THEN '1-3a'
						WHEN months <= 60 THEN '3-5a'
						WHEN months <= 120 THEN '5-10a'
						ELSE '10a+'
					END
				ORDER BY vehicle_id
			`),
		]);

		const last = lastMonthResult.rows[0];
		const first = firstMonthResult.rows[0];

		if (!last?.month_year || last.month_name_int == null || !first?.month_year) {
			throw new Error('Não foi possível identificar o mês mais recente ou o mês inicial.');
		}

		const lastYear = last.month_year;
		const lastMonthInt = Number(last.month_name_int);

		data.recentTabLabel = `Mês mais recente - ${last.month_name?.trim() ?? ''} / ${lastYear}`;
		data.sinceTabLabel = `Desde ${first.month_name?.trim() ?? ''} ${first.month_year}`;

		const [
			recentResult,
			sinceResult,
			brandCountsResult,
			brandModelsResult,
			...extremeResults
		] = await Promise.all([
			queryR2Sql<VehicleStatsRow>(vehicleStatsQuery(lastYear, lastMonthInt)),
			queryR2Sql<VehicleStatsRow>(allTimeVehicleStatsQuery),
			queryR2Sql<BrandCountRow>(`
				SELECT vehicle_id, brand_name, COUNT(DISTINCT fipe_code) AS codes
				FROM silver.precos
				WHERE month_year = '${lastYear}'
					AND month_name_int = ${lastMonthInt}
					AND price_value > 0
				GROUP BY vehicle_id, brand_name
				ORDER BY vehicle_id, codes DESC
			`),
			queryR2Sql<BrandModelsRow>(`
				SELECT
					vehicle_id,
					brand_name,
					COUNT(DISTINCT model_id) AS modelos,
					COUNT(DISTINCT CONCAT(CAST(model_id AS TEXT), '-', version_id)) AS variacoes
				FROM silver.precos
				WHERE month_year = '${lastYear}'
					AND month_name_int = ${lastMonthInt}
					AND price_value > 0
				GROUP BY vehicle_id, brand_name
			`),
			...VEHICLE_IDS.flatMap((id) => [
				queryR2Sql<ExtremeRow>(extremeQuery(lastYear, lastMonthInt, id, true)),
				queryR2Sql<ExtremeRow>(extremeQuery(lastYear, lastMonthInt, id, false)),
			]),
		]);

		data.recentVehicleStats = mapVehicleStats(recentResult.rows ?? []);
		data.sinceVehicleStats = mapVehicleStats(sinceResult.rows ?? []);

		const brandsByYear = brandsByYearResult.rows ?? [];
		data.brandsByYearLabels = brandsByYear.map((row) => row.month_year);
		data.brandsByYearValues = brandsByYear.map((row) => Number(row.marcas));

		const modelsVariations = modelsVariationsResult.rows ?? [];
		data.modelsVariationsLabels = modelsVariations.map((row) => row.month_year);
		data.modelsVariationsDatasets = [
			{ label: 'Modelos', values: modelsVariations.map((row) => Number(row.modelos)) },
			{ label: 'Variações', values: modelsVariations.map((row) => Number(row.variacoes)) },
		];

		const rangeRows = priceRangeResult.rows ?? [];
		data.priceRangeByVehicle = VEHICLE_IDS.map((id) => {
			const byRange = new Map(
				rangeRows
					.filter((row) => Number(row.vehicle_id) === id)
					.map((row) => [row.faixa, Number(row.total)]),
			);
			return {
				id,
				label: VEHICLE_LABELS[id]!,
				labels: [...PRICE_RANGES],
				values: PRICE_RANGES.map((range) => byRange.get(range) ?? 0),
			};
		});

		const depreciationRows = depreciationResult.rows ?? [];
		data.depreciationDatasets = VEHICLE_IDS.map((id) => {
			const byAge = new Map(
				depreciationRows
					.filter((row) => Number(row.vehicle_id) === id)
					.map((row) => [Number(row.age_years), Number(row.pct_retained)]),
			);
			const values = DEPRECIATION_AGES.map((age) =>
				age === 0 ? 100 : Number((byAge.get(age) ?? 0).toFixed(1)),
			);
			return {
				label: formatRelativeLegend(100, values[3] ?? 100, VEHICLE_LABELS[id]!),
				values,
			};
		});

		const relativeRows = relativeDepreciationResult.rows ?? [];
		data.relativeDepreciationDatasets = VEHICLE_IDS.map((id) => {
			const byAge = new Map(
				relativeRows
					.filter((row) => Number(row.vehicle_id) === id)
					.map((row) => [Number(row.age_years), Number(row.pct_relative)]),
			);
			const values = RELATIVE_AGES.map((age) =>
				Number((byAge.get(age) ?? (age === 3 ? 100 : 0)).toFixed(1)),
			);
			return {
				label: formatRelativeLegend(100, values[values.length - 1] ?? 100, VEHICLE_LABELS[id]!),
				values,
			};
		});

		const priceByYear = priceByYearResult.rows ?? [];
		const medianYears = [...new Set(priceByYear.map((row) => row.month_year))].sort();
		data.medianLabels = medianYears;
		data.medianDatasets = seriesByVehicleYear(priceByYear, medianYears, (row) =>
			Number((Number(row?.mediana ?? 0)).toFixed(0)),
		);
		data.meanDatasets = seriesByVehicleYear(priceByYear, medianYears, (row) =>
			Number((Number(row?.media ?? 0)).toFixed(0)),
		);

		const monthly = [...(monthlyCatalogResult.rows ?? [])].sort(
			(a, b) => Number(a.month_year) * 100 + Number(a.m) - (Number(b.month_year) * 100 + Number(b.m)),
		);
		const momWindow = monthly.slice(-13);
		const momSlice = momWindow.slice(-12);
		data.momLabels = momSlice.map((row) => `${String(row.m).padStart(2, '0')}/${row.month_year}`);
		const momPct = (key: 'marcas' | 'modelos' | 'precos') =>
			momSlice.map((row) => {
				const idx = momWindow.findIndex(
					(candidate) =>
						Number(candidate.month_year) === Number(row.month_year) &&
						Number(candidate.m) === Number(row.m),
				);
				const prevRow = idx > 0 ? momWindow[idx - 1] : undefined;
				const prevVal = Number(prevRow?.[key] ?? 0);
				const curr = Number(row[key]);
				if (!prevRow || prevVal === 0) return 0;
				return Number((((curr - prevVal) / prevVal) * 100).toFixed(2));
			});
		data.momDatasets = [
			{ label: 'Marcas %', values: momPct('marcas') },
			{ label: 'Modelos %', values: momPct('modelos') },
			{ label: 'Preços %', values: momPct('precos') },
		];

		const brandCounts = brandCountsResult.rows ?? [];
		data.topBrandsByVehicle = VEHICLE_IDS.map((id) => {
			const rows = brandCounts
				.filter((row) => Number(row.vehicle_id) === id)
				.slice(0, 10);
			return {
				id,
				label: VEHICLE_LABELS[id]!,
				labels: rows.map((row) => row.brand_name),
				values: rows.map((row) => Number(row.codes)),
			};
		});

		const brandModels = brandModelsResult.rows ?? [];
		data.topBrandModelsByVehicle = data.topBrandsByVehicle.map((top) => {
			const byBrand = new Map(
				brandModels
					.filter((row) => Number(row.vehicle_id) === top.id)
					.map((row) => [row.brand_name, row]),
			);
			const sorted = [...top.labels]
				.map((brand) => ({
					brand,
					modelos: Number(byBrand.get(brand)?.modelos ?? 0),
					variacoes: Number(byBrand.get(brand)?.variacoes ?? 0),
				}))
				.sort((a, b) => b.variacoes - a.variacoes);

			return {
				id: top.id,
				label: top.label,
				labels: sorted.map((item) => item.brand),
				datasets: [
					{
						label: 'Modelos',
						values: sorted.map((item) => item.modelos),
					},
					{
						label: 'Variações',
						values: sorted.map((item) => item.variacoes),
					},
				],
			};
		});

		data.concentration = VEHICLE_IDS.map((id) => {
			const rows = brandCounts
				.filter((row) => Number(row.vehicle_id) === id)
				.map((row) => ({ name: row.brand_name, codes: Number(row.codes) }));
			const total = rows.reduce((sum, row) => sum + row.codes, 0) || 1;
			const shares = rows.map((row) => row.codes / total);
			const top5Share = rows.slice(0, 5).reduce((sum, row) => sum + row.codes, 0) / total;
			const hhi = shares.reduce((sum, share) => sum + share * share, 0) * 10000;
			const top = rows[0];
			return {
				id,
				label: VEHICLE_LABELS[id]!,
				top5Share: Number((top5Share * 100).toFixed(1)),
				hhi: Number(hhi.toFixed(0)),
				topBrand: top?.name ?? '—',
				topBrandShare: top ? Number(((top.codes / total) * 100).toFixed(1)) : 0,
			};
		});

		const zeroKmRows = zeroKmResult.rows ?? [];
		const zeroKmYears = [...new Set(zeroKmRows.map((row) => row.month_year))].sort();
		data.zeroKmLabels = zeroKmYears;
		data.zeroKmDatasets = VEHICLE_IDS.map((id) => {
			const byYear = new Map(
				zeroKmRows
					.filter((row) => Number(row.vehicle_id) === id)
					.map((row) => [row.month_year, row]),
			);
			return {
				label: VEHICLE_LABELS[id]!,
				values: zeroKmYears.map((year) => {
					const row = byYear.get(year);
					if (!row) return 0;
					const total = Number(row.zero_km) + Number(row.usados);
					return total > 0 ? Number(((Number(row.zero_km) / total) * 100).toFixed(2)) : 0;
				}),
			};
		});

		const fleetAgeRows = fleetAgeResult.rows ?? [];
		const fleetYears = [...new Set(fleetAgeRows.map((row) => row.month_year))].sort();
		data.fleetAgeLabels = fleetYears;
		data.fleetAgeDatasets = VEHICLE_IDS.map((id) => {
			const byYear = new Map(
				fleetAgeRows
					.filter((row) => Number(row.vehicle_id) === id)
					.map((row) => [row.month_year, Number(row.idade_media)]),
			);
			return {
				label: VEHICLE_LABELS[id]!,
				values: fleetYears.map((year) => Number((byYear.get(year) ?? 0).toFixed(2))),
			};
		});

		const yearlyChurn = yearlyChurnResult.rows ?? [];
		const churnYears = [...new Set(yearlyChurn.map((row) => String(row.y)))].sort();
		data.churnLabels = churnYears;
		data.churnDatasets = VEHICLE_IDS.map((id) => {
			const byYear = new Map(
				yearlyChurn
					.filter((row) => Number(row.vehicle_id) === id)
					.map((row) => [String(row.y), Number(row.entradas)]),
			);
			return {
				label: VEHICLE_LABELS[id]!,
				values: churnYears.map((year) => byYear.get(year) ?? 0),
			};
		});

		const inflationRows = inflationResult.rows ?? [];
		const inflationYears = [...new Set(inflationRows.map((row) => String(row.y)))].sort();
		data.inflationLabels = inflationYears;
		data.inflationDatasets = VEHICLE_IDS.map((id) => {
			const byYear = new Map(
				inflationRows
					.filter((row) => Number(row.vehicle_id) === id)
					.map((row) => [String(row.y), Number(row.avg_price)]),
			);
			const firstYear = inflationYears.find((year) => (byYear.get(year) ?? 0) > 0);
			const base = (firstYear ? byYear.get(firstYear) : 0) || 1;
			return {
				label: VEHICLE_LABELS[id]!,
				values: inflationYears.map((year) => {
					const value = byYear.get(year) ?? 0;
					return value > 0 ? Number(((value / base) * 100).toFixed(1)) : 0;
				}),
			};
		});

		const depBandRows = depByBandResult.rows ?? [];
		data.depByBandDatasets = DEP_PRICE_BANDS.map((band) => {
			const byAge = new Map(
				depBandRows
					.filter((row) => row.faixa === band)
					.map((row) => [Number(row.age_years), Number(row.pct_retained)]),
			);
			return {
				label: DEP_PRICE_BAND_LABELS[band],
				values: DEPRECIATION_AGES.map((age) =>
					age === 0 ? 100 : Number((byAge.get(age) ?? 0).toFixed(1)),
				),
			};
		});

		const depBandRelativeRows = depByBandRelativeResult.rows ?? [];
		data.depByBandRelativeDatasets = DEP_PRICE_BANDS.map((band) => {
			const byAge = new Map(
				depBandRelativeRows
					.filter((row) => row.faixa === band)
					.map((row) => [Number(row.age_years), Number(row.pct_retained)]),
			);
			return {
				label: DEP_PRICE_BAND_LABELS[band],
				values: RELATIVE_AGES.map((age) =>
					Number((byAge.get(age) ?? (age === 3 ? 100 : 0)).toFixed(1)),
				),
			};
		});

		const mapExtreme = (row: ExtremeRow | undefined): ExtremeVehicle | null => {
			if (!row) return null;
			const id = Number(row.vehicle_id);
			return {
				id,
				label: VEHICLE_LABELS[id] ?? String(id),
				brand: row.brand_name,
				model: row.model_name,
				yearModel: formatYearModel(Number(row.year_model)),
				price: Number(row.price_value),
				fipeCode: row.fipe_code,
			};
		};

		data.extremesMax = [];
		data.extremesMin = [];
		VEHICLE_IDS.forEach((id, index) => {
			const maxRow = extremeResults[index * 2]?.rows?.[0];
			const minRow = extremeResults[index * 2 + 1]?.rows?.[0];
			const max = mapExtreme(maxRow);
			const min = mapExtreme(minRow);
			if (max) data.extremesMax.push(max);
			if (min) data.extremesMin.push(min);
		});

		const longevityRows = longevityResult.rows ?? [];
		data.longevityByVehicle = VEHICLE_IDS.map((id) => {
			const byBand = new Map(
				longevityRows
					.filter((row) => Number(row.vehicle_id) === id)
					.map((row) => [row.faixa, Number(row.total)]),
			);
			return {
				id,
				label: VEHICLE_LABELS[id]!,
				labels: [...LONGEVITY_BANDS],
				values: LONGEVITY_BANDS.map((band) => byBand.get(band) ?? 0),
			};
		});

		data.auditTrail = buildStatsAudit({
			lastYear,
			lastMonthInt,
			lastMonthName: last.month_name?.trim() ?? '',
			firstYear: first.month_year,
			firstMonthName: first.month_name?.trim() ?? '',
			concentration: data.concentration,
		});
	} catch (err) {
		data.error = err instanceof Error ? err.message : 'Falha ao consultar o R2 Data Catalog';
	}

	return data;
}
