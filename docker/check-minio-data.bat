@echo off
REM Check MinIO data (BLOB storage)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║              CHECKING MINIO BLOB STORAGE                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 🪣 MinIO Console Access:
echo    URL: http://localhost:9001
echo    Username: minioadmin
echo    Password: minioadmin
echo.

echo 📦 Checking MinIO buckets:
docker exec trimalaksana-minio mc ls minio/ 2>nul || echo "MinIO not accessible via mc"

echo.
echo 📦 Checking trimalaksana-packaging bucket:
docker exec trimalaksana-minio mc ls minio/trimalaksana-packaging --recursive 2>nul | head -20 || echo "Bucket not found or empty"

echo.
echo 📦 Checking trimalaksana-gt bucket:
docker exec trimalaksana-minio mc ls minio/trimalaksana-gt --recursive 2>nul | head -20 || echo "Bucket not found or empty"

echo.
echo 📦 Checking trimalaksana-trucking bucket:
docker exec trimalaksana-minio mc ls minio/trimalaksana-trucking --recursive 2>nul | head -20 || echo "Bucket not found or empty"

echo.
echo ℹ️  Note: MinIO is used for BLOB storage (images, files)
echo    PostgreSQL is used for structured data (products, orders, etc.)
echo.
pause
