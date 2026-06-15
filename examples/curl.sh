#!/usr/bin/env bash
# Call the OpenRates REST API with curl.
# Start the server first: pnpm --filter @openrates/api dev
set -euo pipefail

BASE="${OPENRATES_URL:-http://localhost:3000}"

echo "# Rate USD -> EUR"
curl -s "${BASE}/v1/rates?base=USD&quote=EUR" | jq .

echo "# Convert 1000 USD -> EUR"
curl -s -X POST "${BASE}/v1/convert" \
  -H "content-type: application/json" \
  -d '{"amount":"1000.00","from":"USD","to":"EUR","mode":"official"}' | jq .

echo "# Search currencies"
curl -s "${BASE}/v1/currencies?query=riyal" | jq '.data.currencies'

echo "# OpenAPI document"
curl -s "${BASE}/openapi.json" | jq '.info'
