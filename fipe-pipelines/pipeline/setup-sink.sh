for t in brand model variation price month; do  npx wrangler pipelines sinks create ${t}_sink \
    --type r2-data-catalog \
    --bucket fipe-pipeline-bkt \
    --namespace fipe \
    --table ${t} \
    --catalog-token "$CATALOG_TOKEN" \
    --roll-interval 60
done
