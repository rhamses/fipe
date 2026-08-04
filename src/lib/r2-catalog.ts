import { getCatalogEnv } from './env';

interface CatalogConfig {
	overrides?: {
		prefix?: string;
	};
}

interface NamespaceList {
	namespaces: string[][];
}

interface TableList {
	identifiers: Array<{
		namespace: string[];
		name: string;
	}>;
}

export interface CatalogTable {
	namespace: string;
	name: string;
	fqn: string;
}

async function catalogFetch(path: string, init?: RequestInit): Promise<Response> {
	const { CATALOG_URI, TOKEN } = getCatalogEnv();
	return fetch(`${CATALOG_URI}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			Accept: 'application/json',
			...(init?.headers ?? {}),
		},
	});
}

export async function getCatalogPrefix(): Promise<string> {
	const { WAREHOUSE } = getCatalogEnv();
	const response = await catalogFetch(`/v1/config?warehouse=${encodeURIComponent(WAREHOUSE)}`);

	if (!response.ok) {
		throw new Error(`Catalog config failed (${response.status})`);
	}

	const data = (await response.json()) as CatalogConfig;
	const prefix = data.overrides?.prefix;
	if (!prefix) {
		throw new Error('Catalog config did not return a prefix');
	}

	return prefix;
}

export async function listNamespaces(prefix?: string): Promise<string[]> {
	const catalogPrefix = prefix ?? (await getCatalogPrefix());
	const response = await catalogFetch(`/v1/${catalogPrefix}/namespaces`);

	if (!response.ok) {
		throw new Error(`List namespaces failed (${response.status})`);
	}

	const data = (await response.json()) as NamespaceList;
	return (data.namespaces ?? []).map((parts) => parts.join('.'));
}

export async function listTables(namespace: string, prefix?: string): Promise<CatalogTable[]> {
	const catalogPrefix = prefix ?? (await getCatalogPrefix());
	const response = await catalogFetch(
		`/v1/${catalogPrefix}/namespaces/${encodeURIComponent(namespace)}/tables`,
	);

	if (!response.ok) {
		throw new Error(`List tables failed for ${namespace} (${response.status})`);
	}

	const data = (await response.json()) as TableList;
	return (data.identifiers ?? []).map((item) => {
		const ns = item.namespace.join('.');
		return {
			namespace: ns,
			name: item.name,
			fqn: `${ns}.${item.name}`,
		};
	});
}

export async function listAllTables(): Promise<{
	namespaces: string[];
	tables: CatalogTable[];
}> {
	const prefix = await getCatalogPrefix();
	const namespaces = await listNamespaces(prefix);
	const groups = await Promise.all(namespaces.map((namespace) => listTables(namespace, prefix)));
	return {
		namespaces,
		tables: groups.flat().sort((a, b) => a.fqn.localeCompare(b.fqn)),
	};
}
