import { queryR2Sql } from './r2-sql';
import { buildVehicleForecast, type VehicleForecast } from './vehicle-forecast';

export type VehicleHistoryPoint = {
	monthName: string;
	monthYear: string;
	monthInt: number;
	price: number;
	label: string;
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
};

type HistoryRow = {
	month_name: string;
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

	const result = await queryR2Sql<HistoryRow>(`
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
	`);

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
	};

	history.forecast = await buildVehicleForecast(history, year);
	return history;
}
