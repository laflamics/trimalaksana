#!/bin/bash

# Import Materials directly to PostgreSQL
# Usage: ./import-materials-direct.sh

echo "📥 Importing Materials to PostgreSQL"
echo ""

# Read environment variables or use defaults
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-trimalaksana}

echo "🔗 Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Read materials.json
MATERIALS_FILE="/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/materials.json"

if [ ! -f "$MATERIALS_FILE" ]; then
  echo "❌ File not found: $MATERIALS_FILE"
  exit 1
fi

echo "📖 Reading: $MATERIALS_FILE"

# Convert JSON to PostgreSQL format
MATERIALS_JSON=$(cat "$MATERIALS_FILE" | jq -c '.value // .')

echo "✅ Loaded materials"
echo ""

# Insert into PostgreSQL
echo "📤 Inserting into PostgreSQL..."

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
INSERT INTO storage_data (key, value, updated_at, deleted_at)
VALUES ('materials', '$MATERIALS_JSON'::jsonb, CURRENT_TIMESTAMP, NULL)
ON CONFLICT (key) DO UPDATE SET
  value = '$MATERIALS_JSON'::jsonb,
  updated_at = CURRENT_TIMESTAMP,
  deleted_at = NULL;

SELECT 'Materials imported successfully' as status;
EOF

echo ""
echo "✨ Import complete!"
