@echo off
REM Check PostgreSQL data in storage table

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         CHECKING POSTGRESQL DATA IN STORAGE TABLE          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 📊 Checking all keys in storage table:
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key, LENGTH(value::text) as size_bytes, updated_at FROM storage ORDER BY updated_at DESC LIMIT 20;"

echo.
echo 📊 Checking specific keys (products, gt_salesOrders):
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key, LENGTH(value::text) as size_bytes FROM storage WHERE key IN ('products', 'gt_salesOrders', 'gt_quotations', 'gt_customers');"

echo.
echo 📊 Total records in storage:
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT COUNT(*) as total_keys FROM storage;"

echo.
echo 📊 Sample data from products key:
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT value FROM storage WHERE key = 'products' LIMIT 1;" | head -20

echo.
echo ✅ Done! Check the data above.
echo.
pause
