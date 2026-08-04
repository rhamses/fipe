import { getCatalogEnv, parseWarehouse } from './env';

export interface R2SqlColumn {
	name: string;
}

export interface R2SqlResult<T extends Record<string, unknown> = Record<string, unknown>> {
	success: boolean;
	rows: T[];
	schema: R2SqlColumn[];
	errors: unknown[];
	requestId?: string;
}

interface R2SqlApiResponse {
	success?: boolean;
	errors?: unknown[];
	result?: {
		request_id?: string;
		schema?: Array<{ name: string }>;
		rows?: Array<Record<string, unknown>>;
	};
}

export async function queryR2Sql<T extends Record<string, unknown> = Record<string, unknown>>(
	sql: string,
): Promise<R2SqlResult<T>> {
	const { WAREHOUSE, TOKEN } = getCatalogEnv();
	const { accountId, bucketName } = parseWarehouse(WAREHOUSE);

	const response = await fetch(
		`https://api.sql.cloudflarestorage.com/api/v1/accounts/${accountId}/r2-sql/query/${bucketName}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${TOKEN}`,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({ query: sql }),
		},
	);

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`R2 SQL failed (${response.status}): ${body.slice(0, 300)}`);
	}

	const data = (await response.json()) as R2SqlApiResponse;

	return {
		success: Boolean(data.success),
		rows: (data.result?.rows ?? []) as T[],
		schema: (data.result?.schema ?? []).map((column) => ({ name: column.name })),
		errors: data.errors ?? [],
		requestId: data.result?.request_id,
	};
}

export async function queryScalar<T extends string | number | null = number>(
	sql: string,
	column: string,
): Promise<T | null> {
	const result = await queryR2Sql(sql);
	if (!result.success || result.rows.length === 0) {
		return null;
	}

	return (result.rows[0]?.[column] as T | undefined) ?? null;
}
