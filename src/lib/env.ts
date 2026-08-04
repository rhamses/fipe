import { env } from 'cloudflare:workers';

export interface CatalogEnv {
	WAREHOUSE: string;
	TOKEN: string;
	CATALOG_URI: string;
}

export function getCatalogEnv(): CatalogEnv {
	const warehouse = env.WAREHOUSE;
	const token = env.TOKEN;
	const catalogUri = env.CATALOG_URI;

	if (!warehouse || !token || !catalogUri) {
		throw new Error(
			'Missing R2 Data Catalog env. Set WAREHOUSE, TOKEN, and CATALOG_URI in .dev.vars (local) or as Worker secrets/vars (deploy).',
		);
	}

	return {
		WAREHOUSE: warehouse,
		TOKEN: token,
		CATALOG_URI: catalogUri.replace(/\/$/, ''),
	};
}

export function parseWarehouse(warehouse: string): { accountId: string; bucketName: string } {
	const separator = warehouse.indexOf('_');
	if (separator <= 0) {
		throw new Error(`Invalid WAREHOUSE format: ${warehouse}`);
	}

	return {
		accountId: warehouse.slice(0, separator),
		bucketName: warehouse.slice(separator + 1),
	};
}
