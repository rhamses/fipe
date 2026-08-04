import { getCacheBinding } from './autocomplete';
import { queryR2Sql } from './r2-sql';
import type { VehicleHistoryPoint, VehicleHistoryResponse } from './vehicle-history';

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

const COHORT_PREFIX = 'fipe_lp_consulta:cohort';
const COHORT_TTL_SECONDS = 60 * 60 * 24;
const FORECAST_MONTHS = 12;

type CohortRow = {
	age_years: number;
	pct_retained: number;
	samples: number;
};

export type VehicleForecast = {
	labels: string[];
	values: number[];
	method: 'cohort' | 'history_mom';
	note: string;
	ageYears: number;
	expectedChangePct: number | null;
	horizonMonths: number;
	samples: number;
};

const addMonths = (year: number, monthInt: number, offset: number) => {
	const total = year * 12 + (monthInt - 1) + offset;
	const nextYear = Math.floor(total / 12);
	const nextMonth = (total % 12) + 1;
	return { year: nextYear, monthInt: nextMonth };
};

const labelFor = (year: number, monthInt: number) => {
	const short = MONTH_SHORT[monthInt] ?? String(monthInt).padStart(2, '0');
	return `${short}/${String(year).slice(-2)}`;
};

/** Interpolação linear da retenção (%) entre idades inteiras da curva. */
export const interpolateRetention = (curve: Map<number, number>, age: number): number => {
	if (curve.size === 0) return 100;
	const ages = [...curve.keys()].sort((a, b) => a - b);
	const minAge = ages[0]!;
	const maxAge = ages[ages.length - 1]!;
	if (age <= minAge) return curve.get(minAge) ?? 100;
	if (age >= maxAge) return curve.get(maxAge) ?? 100;

	const floor = Math.floor(age);
	const ceil = Math.ceil(age);
	const low = curve.get(floor);
	const high = curve.get(ceil);
	if (low == null && high == null) return 100;
	if (low == null) return high!;
	if (high == null || floor === ceil) return low;
	const t = age - floor;
	return low + (high - low) * t;
};

export const currentAgeYears = (
	yearModel: number,
	catalogYear: number,
	catalogMonth: number,
): number => {
	if (!Number.isFinite(yearModel) || yearModel === 32000) return 0;
	const years = catalogYear - yearModel;
	if (years < 0) return 0;
	const fraction = Math.max(0, Math.min(11, catalogMonth - 1)) / 12;
	return years + fraction;
};

export const forecastFromRetentionCurve = (
	latestPrice: number,
	ageNow: number,
	curve: Map<number, number>,
	startYear: number,
	startMonth: number,
	months = FORECAST_MONTHS,
): { labels: string[]; values: number[] } => {
	const retentionNow = Math.max(interpolateRetention(curve, ageNow), 0.01);
	const labels: string[] = [];
	const values: number[] = [];

	for (let i = 1; i <= months; i++) {
		const { year, monthInt } = addMonths(startYear, startMonth, i);
		const age = ageNow + i / 12;
		const retention = interpolateRetention(curve, age);
		const price = latestPrice * (retention / retentionNow);
		labels.push(labelFor(year, monthInt));
		values.push(Math.max(0, Math.round(price)));
	}

	return { labels, values };
};

export const forecastFromHistoryMom = (
	points: VehicleHistoryPoint[],
	latestPrice: number,
	months = FORECAST_MONTHS,
): { labels: string[]; values: number[]; monthlyFactor: number } | null => {
	if (points.length < 3 || latestPrice <= 0) return null;

	const ratios: number[] = [];
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1]!.price;
		const curr = points[i]!.price;
		if (prev > 0 && curr > 0) ratios.push(curr / prev);
	}
	if (ratios.length === 0) return null;

	const logAvg = ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) / ratios.length;
	// Evita explosões: MoM típico FIPE fica perto de 1.
	const monthlyFactor = Math.min(1.03, Math.max(0.95, Math.exp(logAvg)));
	const latest = points[points.length - 1]!;
	const labels: string[] = [];
	const values: number[] = [];
	let price = latestPrice;

	for (let i = 1; i <= months; i++) {
		const { year, monthInt } = addMonths(Number(latest.monthYear), latest.monthInt, i);
		price *= monthlyFactor;
		labels.push(labelFor(year, monthInt));
		values.push(Math.max(0, Math.round(price)));
	}

	return { labels, values, monthlyFactor };
};

async function loadCohortCurve(
	vehicleId: number,
	cache: KVNamespace = getCacheBinding(),
): Promise<{ curve: Map<number, number>; samples: number }> {
	const key = `${COHORT_PREFIX}:${vehicleId}`;
	const cached = await cache.get<{ ages: number[]; retained: number[]; samples: number }>(key, 'json');
	if (cached?.ages?.length) {
		return {
			curve: new Map(cached.ages.map((age, i) => [age, cached.retained[i]!])),
			samples: cached.samples,
		};
	}

	const result = await queryR2Sql<CohortRow>(`
		WITH zero_km AS (
			SELECT
				fipe_code,
				vehicle_id,
				CAST(month_year AS INT) AS y,
				CAST(month_name_int AS INT) AS m,
				price_value AS price_0km,
				CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS ym
			FROM silver.precos
			WHERE year_model = 32000
				AND vehicle_id = ${Number(vehicleId)}
				AND price_value IS NOT NULL
				AND price_value > 0
		),
		first_zero AS (
			SELECT fipe_code, vehicle_id, MIN(ym) AS first_ym
			FROM zero_km
			GROUP BY fipe_code, vehicle_id
		),
		launch AS (
			SELECT z.fipe_code, z.vehicle_id, z.y AS launch_year, z.m AS launch_month, z.price_0km
			FROM zero_km z
			INNER JOIN first_zero f
				ON z.fipe_code = f.fipe_code
				AND z.vehicle_id = f.vehicle_id
				AND z.ym = f.first_ym
		),
		paired AS (
			SELECT
				CAST(u.month_year AS INT) - l.launch_year AS age_years,
				u.price_value / l.price_0km * 100.0 AS pct_retained
			FROM launch l
			INNER JOIN silver.precos u
				ON u.fipe_code = l.fipe_code
				AND u.vehicle_id = l.vehicle_id
				AND u.year_model = l.launch_year
				AND CAST(u.month_name_int AS INT) = l.launch_month
				AND u.price_value IS NOT NULL
				AND u.price_value > 0
			WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 1 AND 10
		)
		SELECT age_years, AVG(pct_retained) AS pct_retained, COUNT(*) AS samples
		FROM paired
		GROUP BY age_years
		ORDER BY age_years
	`);

	const rows = result.rows ?? [];
	const curve = new Map<number, number>([[0, 100]]);
	let samples = 0;
	for (const row of rows) {
		const age = Number(row.age_years);
		const pct = Number(row.pct_retained);
		if (!Number.isFinite(age) || !Number.isFinite(pct) || pct <= 0) continue;
		curve.set(age, pct);
		samples += Number(row.samples) || 0;
	}

	await cache.put(
		key,
		JSON.stringify({
			ages: [...curve.keys()],
			retained: [...curve.values()],
			samples,
			updatedAt: new Date().toISOString(),
		}),
		{ expirationTtl: COHORT_TTL_SECONDS },
	);

	return { curve, samples };
}

export async function buildVehicleForecast(
	history: VehicleHistoryResponse,
	yearModel: number,
): Promise<VehicleForecast | null> {
	const latest = history.points[history.points.length - 1];
	const latestPrice = history.latestPrice;
	if (!latest || latestPrice == null || latestPrice <= 0) return null;

	const catalogYear = Number(latest.monthYear);
	const catalogMonth = Number(latest.monthInt);
	const ageYears = currentAgeYears(yearModel, catalogYear, catalogMonth);

	try {
		const { curve, samples } = await loadCohortCurve(history.vehicleId);
		const hasPath = [...curve.keys()].some((age) => age > Math.floor(ageYears));
		if (curve.size >= 2 && hasPath && samples > 0) {
			const projected = forecastFromRetentionCurve(
				latestPrice,
				ageYears,
				curve,
				catalogYear,
				catalogMonth,
			);
			const lastValue = projected.values[projected.values.length - 1] ?? latestPrice;
			const expectedChangePct = Number(
				(((lastValue - latestPrice) / latestPrice) * 100).toFixed(1),
			);
			return {
				...projected,
				method: 'cohort',
				note: 'Estimativa pela curva média de retenção FIPE do mesmo tipo de veículo (coorte 0km → usado).',
				ageYears: Number(ageYears.toFixed(2)),
				expectedChangePct,
				horizonMonths: FORECAST_MONTHS,
				samples,
			};
		}
	} catch {
		// fallback abaixo
	}

	const mom = forecastFromHistoryMom(history.points, latestPrice);
	if (!mom) return null;

	const lastValue = mom.values[mom.values.length - 1] ?? latestPrice;
	const expectedChangePct = Number((((lastValue - latestPrice) / latestPrice) * 100).toFixed(1));
	return {
		labels: mom.labels,
		values: mom.values,
		method: 'history_mom',
		note: 'Fallback: média geométrica MoM do histórico recente deste veículo (curva de coorte indisponível).',
		ageYears: Number(ageYears.toFixed(2)),
		expectedChangePct,
		horizonMonths: FORECAST_MONTHS,
		samples: history.points.length,
	};
}
