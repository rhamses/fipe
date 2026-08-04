export type AuditEntry = {
	id: string;
	title: string;
	summary: string;
	notes: string[];
	sql: string[];
};

export type AuditConcentration = {
	label: string;
	hhi: number;
	top5Share: number;
	topBrand: string;
	topBrandShare: number;
};

type AuditContext = {
	lastYear: string;
	lastMonthInt: number;
	lastMonthName: string;
	firstYear: string;
	firstMonthName: string;
	concentration: AuditConcentration[];
};

const VEHICLE_IDS = [1, 2, 3] as const;
const VEHICLE_LABELS: Record<number, string> = {
	1: 'Carros',
	2: 'Motos',
	3: 'Caminhões',
};
const DEP_PRICE_BANDS = ['ate-80k', '80-150k', '150k+'] as const;

const trimSql = (sql: string) =>
	sql
		.replace(/^\n+/, '')
		.replace(/\n+$/, '')
		.replace(/\t/g, '  ');

export function buildStatsAudit(ctx: AuditContext): AuditEntry[] {
	const { lastYear, lastMonthInt, lastMonthName, firstYear, firstMonthName, concentration } =
		ctx;
	const period = `${lastMonthName} / ${lastYear} (month_name_int=${lastMonthInt})`;

	const hhiNotes = concentration.map(
		(item) =>
			`${item.label}: HHI=${item.hhi} · top-5=${item.top5Share}% · líder ${item.topBrand} (${item.topBrandShare}%)`,
	);

	return [
		{
			id: 'tabs-stats',
			title: 'Cards de abas (mês recente / desde o início)',
			summary: `Recorte recente = ${period}. Recorte “desde” agrega todo o histórico a partir de ${firstMonthName} ${firstYear}.`,
			notes: [
				'Marcas/modelos usam COUNT(DISTINCT …).',
				'Preços = COUNT(*) de linhas com price_value > 0.',
				'Maior/menor = MAX/MIN(price_value) no recorte.',
			],
			sql: [
				trimSql(`
SELECT vehicle_id, vehicle_text,
  COUNT(DISTINCT brand_name) AS marcas,
  COUNT(DISTINCT model_id) AS modelos,
  COUNT(*) AS precos,
  MAX(price_value) AS maior_preco,
  MIN(price_value) AS menor_preco
FROM silver.precos
WHERE month_year = '${lastYear}'
  AND month_name_int = ${lastMonthInt}
  AND price_value IS NOT NULL AND price_value > 0
GROUP BY vehicle_id, vehicle_text
ORDER BY vehicle_id
`),
				trimSql(`
SELECT vehicle_id, vehicle_text,
  COUNT(DISTINCT brand_name) AS marcas,
  COUNT(DISTINCT model_id) AS modelos,
  COUNT(*) AS precos,
  MAX(price_value) AS maior_preco,
  MIN(price_value) AS menor_preco
FROM silver.precos
WHERE month_name != 'x' AND month_year IS NOT NULL
  AND price_value IS NOT NULL AND price_value > 0
GROUP BY vehicle_id, vehicle_text
ORDER BY vehicle_id
`),
			],
		},
		{
			id: 'extremes',
			title: 'Mais caros e mais baratos do mês',
			summary: `Um registro por vehicle_id no mês ${period}, ordenado por price_value.`,
			notes: [
				'year_model = 32000 é exibido como “0km”.',
				'São 6 queries LIMIT 1 (max/min × Carros/Motos/Caminhões).',
			],
			sql: VEHICLE_IDS.flatMap((id) => [
				trimSql(`
SELECT vehicle_id, brand_name, model_name, year_model, price_value, fipe_code
FROM silver.precos
WHERE month_year = '${lastYear}' AND month_name_int = ${lastMonthInt}
  AND vehicle_id = ${id} AND price_value > 0
ORDER BY price_value DESC
LIMIT 1
-- ${VEHICLE_LABELS[id]} mais caro
`),
				trimSql(`
SELECT vehicle_id, brand_name, model_name, year_model, price_value, fipe_code
FROM silver.precos
WHERE month_year = '${lastYear}' AND month_name_int = ${lastMonthInt}
  AND vehicle_id = ${id} AND price_value > 0
ORDER BY price_value ASC
LIMIT 1
-- ${VEHICLE_LABELS[id]} mais barato
`),
			]),
		},
		{
			id: 'concentration',
			title: 'Concentração de mercado (mês recente)',
			summary:
				'Share das marcas por COUNT(DISTINCT fipe_code) no mês recente. Top-5 e HHI calculados no app.',
			notes: [
				'HHI = Σ(share²) × 10.000 (escala 0–10.000).',
				'Referência: <1500 pouco concentrado · 1500–2500 moderado · >2500 concentrado.',
				...hhiNotes,
			],
			sql: [
				trimSql(`
SELECT vehicle_id, brand_name, COUNT(DISTINCT fipe_code) AS codes
FROM silver.precos
WHERE month_year = '${lastYear}'
  AND month_name_int = ${lastMonthInt}
  AND price_value > 0
GROUP BY vehicle_id, brand_name
ORDER BY vehicle_id, codes DESC
`),
			],
		},
		{
			id: 'median-mean',
			title: 'Preço mediano / médio por ano',
			summary:
				'approx_median e AVG(price_value) por vehicle_id e month_year.',
			notes: ['Usa approx_median (R2 SQL) por performance em volume grande.'],
			sql: [
				trimSql(`
SELECT vehicle_id, month_year,
  approx_median(price_value) AS mediana,
  AVG(price_value) AS media
FROM silver.precos
WHERE month_name != 'x' AND month_year IS NOT NULL AND price_value > 0
GROUP BY vehicle_id, month_year
ORDER BY month_year ASC, vehicle_id ASC
`),
			],
		},
		{
			id: 'inflation',
			title: 'Inflação FIPE sintética (painel fixo)',
			summary:
				'Painel de fipe_code presentes desde o 1º ano de cada vehicle_id até o mês mais recente; índice 100 no 1º ano de cada série.',
			notes: [
				'HAVING MIN(year) ≤ first_y do vehicle_id e MAX(ym) ≥ último mês global.',
				'Média anual AVG(price_value) só dos códigos do painel.',
			],
			sql: [
				trimSql(`
WITH first_years AS (
  SELECT vehicle_id, MIN(CAST(month_year AS INT)) AS first_y
  FROM silver.precos
  WHERE month_name != 'x' AND month_year IS NOT NULL
  GROUP BY vehicle_id
),
last_period AS (
  SELECT CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS last_ym
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
  SELECT p.vehicle_id, CAST(s.month_year AS INT) AS y,
    AVG(s.price_value) AS avg_price, COUNT(*) AS n
  FROM silver.precos s
  INNER JOIN panel p ON s.fipe_code = p.fipe_code AND s.vehicle_id = p.vehicle_id
  WHERE s.month_name != 'x' AND s.price_value > 0
    AND CAST(s.month_year AS INT) >= p.first_y
  GROUP BY p.vehicle_id, CAST(s.month_year AS INT)
)
SELECT * FROM yearly ORDER BY y, vehicle_id
`),
			],
		},
		{
			id: 'mom',
			title: 'Variação mês a mês do catálogo',
			summary:
				'Catálogo mensal (marcas/modelos/preços) → variação % vs. mês anterior nos últimos 12 meses (precisa do 13º para a 1ª variação).',
			notes: ['MoM calculado no app a partir da série mensal ordenada.'],
			sql: [
				trimSql(`
SELECT month_year, CAST(month_name_int AS INT) AS m,
  COUNT(DISTINCT brand_name) AS marcas,
  COUNT(DISTINCT model_id) AS modelos,
  COUNT(*) AS precos
FROM silver.precos
WHERE month_name != 'x' AND month_year IS NOT NULL
GROUP BY month_year, month_name_int
ORDER BY CAST(month_year AS INT), month_name_int
`),
			],
		},
		{
			id: 'top-brands',
			title: 'Top marcas / variações × modelos',
			summary: `Top 10 marcas por códigos FIPE no mês ${period}; o 2º gráfico cruza modelos e variações das mesmas marcas.`,
			notes: [
				'Variação = DISTINCT CONCAT(model_id, "-", version_id).',
				'Ranking e join feitos no app após as agregações SQL.',
			],
			sql: [
				trimSql(`
SELECT vehicle_id, brand_name, COUNT(DISTINCT fipe_code) AS codes
FROM silver.precos
WHERE month_year = '${lastYear}' AND month_name_int = ${lastMonthInt}
  AND price_value > 0
GROUP BY vehicle_id, brand_name
ORDER BY vehicle_id, codes DESC
`),
				trimSql(`
SELECT vehicle_id, brand_name,
  COUNT(DISTINCT model_id) AS modelos,
  COUNT(DISTINCT CONCAT(CAST(model_id AS TEXT), '-', version_id)) AS variacoes
FROM silver.precos
WHERE month_year = '${lastYear}' AND month_name_int = ${lastMonthInt}
  AND price_value > 0
GROUP BY vehicle_id, brand_name
`),
			],
		},
		{
			id: 'zero-km',
			title: 'Share de 0km vs. usados',
			summary: '% de registros com year_model = 32000 por ano e vehicle_id.',
			notes: ['Share = zero_km / (zero_km + usados) × 100, calculado no app.'],
			sql: [
				trimSql(`
SELECT month_year, vehicle_id,
  SUM(CASE WHEN year_model = 32000 THEN 1 ELSE 0 END) AS zero_km,
  SUM(CASE WHEN year_model != 32000 THEN 1 ELSE 0 END) AS usados
FROM silver.precos
WHERE month_name != 'x' AND month_year IS NOT NULL
GROUP BY month_year, vehicle_id
ORDER BY month_year ASC, vehicle_id ASC
`),
			],
		},
		{
			id: 'fleet-age',
			title: 'Idade média da frota listada',
			summary: 'AVG(ano_tabela − year_model), excluindo 0km e year_model ≤ 1980.',
			notes: ['Filtro CAST(month_year AS INT) >= year_model.'],
			sql: [
				trimSql(`
SELECT month_year, vehicle_id,
  AVG(CAST(month_year AS INT) - year_model) AS idade_media
FROM silver.precos
WHERE month_name != 'x'
  AND year_model IS NOT NULL AND year_model != 32000 AND year_model > 1980
  AND CAST(month_year AS INT) >= year_model
GROUP BY month_year, vehicle_id
ORDER BY month_year ASC, vehicle_id ASC
`),
			],
		},
		{
			id: 'yearly-churn',
			title: 'Entradas de modelos por ano',
			summary:
				'Modelos presentes no ano Y e ausentes em Y−1 (LEFT JOIN em yearly_models).',
			notes: ['Primeiro ano de cada série conta todos os modelos como entradas.'],
			sql: [
				trimSql(`
WITH yearly_models AS (
  SELECT CAST(month_year AS INT) AS y, vehicle_id, model_id
  FROM silver.precos
  WHERE month_name != 'x' AND month_year IS NOT NULL
  GROUP BY CAST(month_year AS INT), vehicle_id, model_id
)
SELECT a.y, a.vehicle_id, COUNT(*) AS modelos,
  SUM(CASE WHEN b.model_id IS NULL THEN 1 ELSE 0 END) AS entradas
FROM yearly_models a
LEFT JOIN yearly_models b
  ON a.vehicle_id = b.vehicle_id AND a.model_id = b.model_id AND b.y = a.y - 1
GROUP BY a.y, a.vehicle_id
ORDER BY a.y, a.vehicle_id
`),
			],
		},
		{
			id: 'brands-models',
			title: 'Marcas por ano · Modelos × variações',
			summary: 'Agregações anuais de marcas, modelos e variações no catálogo.',
			notes: [],
			sql: [
				trimSql(`
SELECT month_year, COUNT(DISTINCT brand_name) AS marcas
FROM silver.precos
WHERE month_name != 'x' AND month_year IS NOT NULL
GROUP BY month_year
ORDER BY month_year ASC
`),
				trimSql(`
SELECT month_year,
  COUNT(DISTINCT model_id) AS modelos,
  COUNT(DISTINCT CONCAT(CAST(model_id AS TEXT), '-', version_id)) AS variacoes
FROM silver.precos
WHERE month_name != 'x' AND month_year IS NOT NULL
GROUP BY month_year
ORDER BY month_year ASC
`),
			],
		},
		{
			id: 'price-ranges',
			title: 'Distribuição por faixa de preço',
			summary: 'Faixas 20–50k … 300k+ via CASE em price_value; pizza por vehicle_id.',
			notes: ['Inclui a faixa 120–200k.'],
			sql: [
				trimSql(`
SELECT vehicle_id, vehicle_text,
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
			],
		},
		{
			id: 'longevity',
			title: 'Longevidade no catálogo',
			summary: 'COUNT(DISTINCT month_id) por fipe_code → faixas 0–1a … 10a+.',
			notes: [],
			sql: [
				trimSql(`
SELECT vehicle_id,
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
GROUP BY vehicle_id,
  CASE
    WHEN months <= 12 THEN '0-1a'
    WHEN months <= 36 THEN '1-3a'
    WHEN months <= 60 THEN '3-5a'
    WHEN months <= 120 THEN '5-10a'
    ELSE '10a+'
  END
ORDER BY vehicle_id
`),
			],
		},
		{
			id: 'depreciation-0-3',
			title: 'Curva de preço 0km → 3 anos',
			summary:
				'Primeiro mês 0km (year_model=32000) por fipe_code; compara preço do mesmo código com year_model = ano de lançamento 1–3 anos depois.',
			notes: ['Valor plotado = AVG(% do preço 0km retido); ponto 0km forçado em 100%.'],
			sql: [
				trimSql(`
WITH zero_km AS (
  SELECT fipe_code, vehicle_id,
    CAST(month_year AS INT) AS y, CAST(month_name_int AS INT) AS m,
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
  SELECT l.vehicle_id,
    CAST(u.month_year AS INT) - l.launch_year AS age_years,
    u.price_value / l.price_0km * 100.0 AS pct_retained
  FROM launch l
  INNER JOIN silver.precos u
    ON u.fipe_code = l.fipe_code AND u.vehicle_id = l.vehicle_id
    AND u.year_model = l.launch_year
    AND CAST(u.month_name_int AS INT) = l.launch_month
    AND u.price_value IS NOT NULL AND u.price_value > 0
  WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 1 AND 3
)
SELECT vehicle_id, age_years, AVG(pct_retained) AS pct_retained, COUNT(*) AS samples
FROM paired GROUP BY vehicle_id, age_years
ORDER BY vehicle_id, age_years
`),
			],
		},
		{
			id: 'dep-band-0-3',
			title: 'Depreciação por faixa (carros) · 0km → 3 anos',
			summary: `Mesma lógica da curva 0–3, filtrada a vehicle_id=1, agrupada por faixa de preço 0km: ${DEP_PRICE_BANDS.join(', ')}.`,
			notes: ['Faixas: <80k · 80–150k · 150k+.'],
			sql: [
				trimSql(`
WITH zero_km AS (
  SELECT fipe_code, vehicle_id,
    CAST(month_year AS INT) AS y, CAST(month_name_int AS INT) AS m,
    price_value AS price_0km,
    CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS ym,
    CASE
      WHEN price_value < 80000 THEN 'ate-80k'
      WHEN price_value < 150000 THEN '80-150k'
      ELSE '150k+'
    END AS faixa
  FROM silver.precos
  WHERE year_model = 32000 AND price_value > 0 AND vehicle_id = 1
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
  SELECT l.faixa,
    CAST(u.month_year AS INT) - l.launch_year AS age_years,
    u.price_value / l.price_0km * 100.0 AS pct_retained
  FROM launch l
  INNER JOIN silver.precos u
    ON u.fipe_code = l.fipe_code AND u.vehicle_id = l.vehicle_id
    AND u.year_model = l.launch_year
    AND CAST(u.month_name_int AS INT) = l.launch_month
    AND u.price_value > 0
  WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 1 AND 3
)
SELECT faixa, age_years, AVG(pct_retained) AS pct_retained, COUNT(*) AS samples
FROM paired GROUP BY faixa, age_years
ORDER BY faixa, age_years
`),
			],
		},
		{
			id: 'depreciation-3-10',
			title: 'Curva de preço 3 → 10 anos',
			summary:
				'% relativa ao preço aos 3 anos (base 100). Paired ages 3–10; join com preço aos 3 anos por fipe_code.',
			notes: ['Legenda mostra Δ% de 3 para 10 anos.'],
			sql: [
				trimSql(`
WITH zero_km AS (
  SELECT fipe_code, vehicle_id,
    CAST(month_year AS INT) AS y, CAST(month_name_int AS INT) AS m,
    price_value AS price_0km,
    CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS ym
  FROM silver.precos
  WHERE year_model = 32000 AND price_value > 0
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
  SELECT l.vehicle_id, l.fipe_code,
    CAST(u.month_year AS INT) - l.launch_year AS age_years,
    u.price_value
  FROM launch l
  INNER JOIN silver.precos u
    ON u.fipe_code = l.fipe_code AND u.vehicle_id = l.vehicle_id
    AND u.year_model = l.launch_year
    AND CAST(u.month_name_int AS INT) = l.launch_month
    AND u.price_value > 0
  WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 3 AND 10
),
at3 AS (
  SELECT vehicle_id, fipe_code, price_value AS price_3yr
  FROM paired WHERE age_years = 3
)
SELECT p.vehicle_id, p.age_years,
  AVG(p.price_value / a.price_3yr * 100.0) AS pct_relative,
  COUNT(*) AS samples
FROM paired p
INNER JOIN at3 a ON p.fipe_code = a.fipe_code AND p.vehicle_id = a.vehicle_id
GROUP BY p.vehicle_id, p.age_years
ORDER BY p.vehicle_id, p.age_years
`),
			],
		},
		{
			id: 'dep-band-3-10',
			title: 'Depreciação por faixa (carros) · 3 → 10 anos',
			summary:
				'Relativo aos 3 anos, por faixa do preço 0km de lançamento (somente carros).',
			notes: ['Mesmas faixas ate-80k / 80-150k / 150k+.'],
			sql: [
				trimSql(`
WITH zero_km AS (
  SELECT fipe_code, vehicle_id,
    CAST(month_year AS INT) AS y, CAST(month_name_int AS INT) AS m,
    price_value AS price_0km,
    CAST(month_year AS INT) * 100 + CAST(month_name_int AS INT) AS ym,
    CASE
      WHEN price_value < 80000 THEN 'ate-80k'
      WHEN price_value < 150000 THEN '80-150k'
      ELSE '150k+'
    END AS faixa
  FROM silver.precos
  WHERE year_model = 32000 AND price_value > 0 AND vehicle_id = 1
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
  SELECT l.faixa, l.fipe_code,
    CAST(u.month_year AS INT) - l.launch_year AS age_years,
    u.price_value
  FROM launch l
  INNER JOIN silver.precos u
    ON u.fipe_code = l.fipe_code AND u.vehicle_id = l.vehicle_id
    AND u.year_model = l.launch_year
    AND CAST(u.month_name_int AS INT) = l.launch_month
    AND u.price_value > 0
  WHERE CAST(u.month_year AS INT) - l.launch_year BETWEEN 3 AND 10
),
at3 AS (
  SELECT faixa, fipe_code, price_value AS price_3yr
  FROM paired WHERE age_years = 3
)
SELECT p.faixa, p.age_years,
  AVG(p.price_value / a.price_3yr * 100.0) AS pct_retained,
  COUNT(*) AS samples
FROM paired p
INNER JOIN at3 a ON p.fipe_code = a.fipe_code AND p.faixa = a.faixa
GROUP BY p.faixa, p.age_years
ORDER BY p.faixa, p.age_years
`),
			],
		},
	];
}
