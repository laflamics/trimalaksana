#!/bin/bash
SERVER_URL="${1:-http://localhost:8888}"
echo "Posting to server: $SERVER_URL"
curl -X POST "$SERVER_URL/api/storage/products" \
  -H "Content-Type: application/json" \
  -d @products_cleaned_for_server.json
echo ""
