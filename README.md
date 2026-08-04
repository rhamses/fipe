# FIPE LP

Landing page em **Astro** no **Cloudflare Workers**, com Alpine.js, HTMX, Astro Icon, Chart.js e consulta ao **R2 Data Catalog**.

## Stack

| Pacote | Uso |
| --- | --- |
| `astro` + `@astrojs/cloudflare` | SSR / deploy em Workers |
| `@astrojs/alpinejs` | Interatividade no cliente |
| `htmx.org` | HTML parcial |
| `@iconify-json/lucide` + `Icon.astro` | Ícones SVG (compatível com workerd) |
| `chart.js` | Gráficos (`PriceChart.astro`) |
| R2 Data Catalog + R2 SQL | Stats em `/stats` |

## Variáveis de ambiente

Copie `.env.example` para `.env` e `.dev.vars` (Wrangler usa `.dev.vars` no runtime local):

```bash
cp .env.example .env
cp .env.example .dev.vars
```

| Variável | Descrição |
| --- | --- |
| `WAREHOUSE` | Nome do warehouse do R2 Data Catalog |
| `TOKEN` | API token R2 (secret) |
| `CATALOG_URI` | URI do Iceberg REST catalog |

Em produção, `WAREHOUSE` e `CATALOG_URI` estão em `wrangler.jsonc` → `vars`. Defina o secret:

```bash
npx wrangler secret put TOKEN
```

## Comandos

```bash
npm run dev
npm run build
npm run deploy
```

## Páginas

- `/` — demo da stack
- `/stats` — namespaces/tabelas do catálogo + métricas `silver.*` via R2 SQL
