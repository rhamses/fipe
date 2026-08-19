import { queryR2Sql } from './r2-sql';
import { buildVehicleForecast, type VehicleForecast } from './vehicle-forecast';

export type VehicleHistoryPoint = {
	monthName: string;
	monthYear: string;
	monthInt: number;
	price: number;
	label: string;
};

export type FromZeroKmPoint = {
	months: number;
	pct: number;
	price: number;
	label: string;
};

export type FromZeroKmSeries = {
	labels: string[];
	values: number[];
	points: FromZeroKmPoint[];
	price0km: number;
	startLabel: string;
	latestChangePct: number | null;
};

export type VehicleHistoryResponse = {
	title: string;
	monthName: string;
	monthYear: string;
	latestPrice: number | null;
	labels: string[];
	values: number[];
	points: VehicleHistoryPoint[];
	vehicleId: number;
	vehicleLabel: string;
	forecast: VehicleForecast | null;
	fromZeroKm: FromZeroKmSeries | null;
};

type HistoryRow = {
	month_name: string;
	month_year: string;
	month_name_int: number;
	price_value: number;
};

type FipeCodeRow = {
	fipe_code: string;
};

type ZeroKmRow = {
	month_year: string;
	month_name_int: number;
	price_value: number;
};

const MONTH_SHORT: Record<number, string> = {
	1: 'Jan',
	2: 'Fev',
	3: 'Mar',
	4: 'Abr',
	5: 'Mai',
	6: 'Jun',
	7: 'Jul',
	8: 'Ago',
	9: 'Set',
	10: 'Out',
	11: 'Nov',
	12: 'Dez',
};

const VEHICLE_LABELS: Record<number, string> = {
	1: 'Carros',
	2: 'Motos',
	3: 'Caminhões',
};

export const escapeSqlLiteral = (value: string) => value.replace(/'/g, "''");

export const capitalizeMonth = (month: string) => {
	const trimmed = month.trim();
	if (!trimmed) return '—';
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const absMonth = (year: number, monthInt: number) => year * 12 + monthInt;

const monthLabel = (year: number, monthInt: number) => {
	const short = MONTH_SHORT[monthInt] ?? String(monthInt).padStart(2, '0');
	return `${short}/${String(year).slice(-2)}`;
};

const parseZeroKmRows = (rows: ZeroKmRow[]) =>
	rows
		.map((row) => {
			const year = Number(row.month_year);
			const monthInt = Number(row.month_name_int);
			const price = Number(row.price_value);
			return {
				year,
				monthInt,
				price,
				abs: absMonth(year, monthInt),
			};
		})
		.filter(
			(row) =>
				Number.isFinite(row.year) &&
				Number.isFinite(row.monthInt) &&
				Number.isFinite(row.price) &&
				row.price > 0,
		)
		.sort((a, b) => a.abs - b.abs);

const vehicleMatchSql = (params: {
	brand: string;
	model: string;
	version: string;
	year: number;
	vehicleId: number;
}) => `
	brand_name = '${params.brand}'
		AND model_name = '${params.model}'
		AND version_id = '${params.version}'
		AND year_model = ${params.year}
		AND vehicle_id = ${params.vehicleId}
		AND month_name != 'x'
		AND month_year IS NOT NULL
		AND price_value IS NOT NULL
		AND price_value > 0
`;

export async function loadFromZeroKmSeries(params: {
	brand: string;
	model: string;
	version: string;
	year: number;
	vehicleId: number;
}): Promise<FromZeroKmSeries | null> {
	const codeResult = await queryR2Sql<FipeCodeRow>(`
		SELECT fipe_code
		FROM silver.precos
		WHERE ${vehicleMatchSql(params)}
			AND fipe_code IS NOT NULL
		LIMIT 1
	`);
	const fipeCode = escapeSqlLiteral(String(codeResult.rows?.[0]?.fipe_code ?? '').trim());
	if (!fipeCode) return null;

	const selectedYear = Number(params.year);
	const vehicleId = Number(params.vehicleId);
	const followYear = selectedYear === 32000 ? 32000 : selectedYear;

	const [zerosResult, usedResult] = await Promise.all([
		queryR2Sql<ZeroKmRow>(`
			SELECT month_year, month_name_int, price_value
			FROM silver.precos
			WHERE fipe_code = '${fipeCode}'
				AND vehicle_id = ${vehicleId}
				AND year_model = 32000
				AND month_name != 'x'
				AND month_year IS NOT NULL
				AND price_value IS NOT NULL
				AND price_value > 0
			ORDER BY CAST(month_year AS INT) ASC, CAST(month_name_int AS INT) ASC
		`),
		followYear === 32000
			? Promise.resolve({ rows: [] as ZeroKmRow[] })
			: queryR2Sql<ZeroKmRow>(`
					SELECT month_year, month_name_int, price_value
					FROM silver.precos
					WHERE fipe_code = '${fipeCode}'
						AND vehicle_id = ${vehicleId}
						AND year_model = ${followYear}
						AND month_name != 'x'
						AND month_year IS NOT NULL
						AND price_value IS NOT NULL
						AND price_value > 0
					ORDER BY CAST(month_year AS INT) ASC, CAST(month_name_int AS INT) ASC
				`),
	]);

	const zeros = parseZeroKmRows(zerosResult.rows ?? []);
	if (zeros.length === 0) return null;

	const used = followYear === 32000 ? zeros : parseZeroKmRows(usedResult.rows ?? []);

	const firstUsedAbs = used[0]?.abs;
	const baseline =
		selectedYear === 32000 || firstUsedAbs == null
			? zeros[0]!
			: ([...zeros].reverse().find((row) => row.abs <= firstUsedAbs) ?? zeros[0]!);

	const byMonths = new Map<number, FromZeroKmPoint>();
	byMonths.set(0, {
		months: 0,
		pct: 0,
		price: baseline.price,
		label: monthLabel(baseline.year, baseline.monthInt),
	});

	for (const row of used) {
		const months = row.abs - baseline.abs;
		if (months <= 0) continue;
		const pct = Number((((row.price - baseline.price) / baseline.price) * 100).toFixed(1));
		byMonths.set(months, {
			months,
			pct,
			price: row.price,
			label: monthLabel(row.year, row.monthInt),
		});
	}

	const points = [...byMonths.values()].sort((a, b) => a.months - b.months);
	if (points.length < 2) return null;

	const latest = points[points.length - 1]!;
	return {
		labels: points.map((point) => String(point.months)),
		values: points.map((point) => point.pct),
		points,
		price0km: baseline.price,
		startLabel: monthLabel(baseline.year, baseline.monthInt),
		latestChangePct: latest.pct,
	};
}

export async function getVehiclePriceHistory(params: {
	brand: string;
	model: string;
	version: string;
	year: number;
	vehicleId: number;
}): Promise<VehicleHistoryResponse> {
	const brand = escapeSqlLiteral(params.brand.trim());
	const model = escapeSqlLiteral(params.model.trim());
	const version = escapeSqlLiteral(params.version.trim());
	const year = Number(params.year);
	const vehicleId = Number(params.vehicleId);

	const [result, fromZeroKm] = await Promise.all([
		queryR2Sql<HistoryRow>(`
			SELECT month_name, month_year, month_name_int, price_value
			FROM silver.precos
			WHERE brand_name = '${brand}'
				AND model_name = '${model}'
				AND version_id = '${version}'
				AND year_model = ${year}
				AND vehicle_id = ${vehicleId}
				AND month_name != 'x'
				AND month_year IS NOT NULL
				AND price_value IS NOT NULL
				AND price_value > 0
			ORDER BY CAST(month_year AS INT) DESC, CAST(month_name_int AS INT) DESC
			LIMIT 12
		`),
		loadFromZeroKmSeries({ brand, model, version, year, vehicleId }).catch(() => null),
	]);

	const rows = [...(result.rows ?? [])].reverse();
	const points: VehicleHistoryPoint[] = rows.map((row) => {
		const monthInt = Number(row.month_name_int);
		const monthYear = String(row.month_year);
		const short = MONTH_SHORT[monthInt] ?? String(monthInt).padStart(2, '0');
		return {
			monthName: String(row.month_name ?? '').trim(),
			monthYear,
			monthInt,
			price: Number(row.price_value),
			label: `${short}/${monthYear.slice(-2)}`,
		};
	});

	const latest = points[points.length - 1];
	const monthName = latest ? capitalizeMonth(latest.monthName) : '—';
	const monthYear = latest?.monthYear ?? '—';

	const history: VehicleHistoryResponse = {
		title: `Valor ${monthName} ${monthYear}`,
		monthName,
		monthYear,
		latestPrice: latest?.price ?? null,
		labels: points.map((point) => point.label),
		values: points.map((point) => point.price),
		points,
		vehicleId,
		vehicleLabel: VEHICLE_LABELS[vehicleId] ?? String(vehicleId),
		forecast: null,
		fromZeroKm,
	};

	history.forecast = await buildVehicleForecast(history, year);
	return history;
}
