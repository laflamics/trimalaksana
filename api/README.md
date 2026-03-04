# Trimalaksana Go API Server

Minimal Go server untuk storage operations dengan PostgreSQL + MinIO integration.

## Quick Start

### 1. Prerequisites

```bash
# Install Go 1.21+
go version

# Install PostgreSQL
# Install MinIO
# Install Docker (optional, untuk containerization)
```

### 2. Setup Database

```bash
# Create database
createdb trimalaksana_db

# Run schema
psql -U postgres -d trimalaksana_db -f schema.sql

# Verify
psql -U postgres -d trimalaksana_db -c "\dt"
```

### 3. Setup MinIO

```bash
# Option A: Docker
docker run --name minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  -p 9000:9000 \
  -p 9001:9001 \
  -v minio_data:/minio_data \
  -d minio/minio:latest \
  server /minio_data --console-address ":9001"

# Option B: Local
minio server /mnt/data

# Create bucket
mc alias set minio http://localhost:9000 minioadmin minioadmin123
mc mb minio/trimalaksana-files
```

### 4. Setup Go Server

```bash
# Copy .env
cp .env.example .env

# Edit .env with your credentials
nano .env

# Install dependencies
go mod download

# Run server
go run main.go handlers.go

# Server running on http://localhost:8080
```

### 5. Test API

```bash
# Health check
curl http://localhost:8080/health

# Get storage data
curl http://localhost:8080/api/storage/products

# Set storage data
curl -X POST http://localhost:8080/api/storage/products \
  -H "Content-Type: application/json" \
  -d '[{"id":"1","name":"Product 1"}]'

# Upload file
curl -X POST http://localhost:8080/api/upload \
  -F "file=@/path/to/file.pdf" \
  -F "module=packaging"
```

## API Endpoints

### Storage Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/storage/{key}` | Get storage data |
| POST | `/api/storage/{key}` | Set storage data |
| DELETE | `/api/storage/{key}` | Delete storage data |

### File Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file to MinIO |
| GET | `/api/download/{fileId}` | Download file from MinIO |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `/ws` | Real-time sync via WebSocket |

## Project Structure

```
api/
├── main.go           # Server setup, routes
├── handlers.go       # API handlers
├── schema.sql        # Database schema
├── go.mod            # Go dependencies
├── .env.example      # Environment template
└── README.md         # This file
```

## Environment Variables

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=trimalaksana
DB_PASSWORD=your_password
DB_NAME=trimalaksana_db

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false

API_PORT=8080
API_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

ENV=development
```

## Next Steps

1. **Implement PostgreSQL CRUD** in `handlers.go`
   - Replace TODO comments with actual DB queries
   - Use `sqlx` for prepared statements

2. **Add Authentication**
   - JWT tokens
   - User validation

3. **Add Logging**
   - Structured logging with `logrus` or `zap`
   - Request/response logging

4. **Add Validation**
   - Input validation
   - Error handling

5. **Add Tests**
   - Unit tests
   - Integration tests

6. **Deploy**
   - Docker containerization
   - Kubernetes deployment
   - CI/CD pipeline

## Troubleshooting

### Database connection failed
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check credentials in .env
```

### MinIO connection failed
```bash
# Check MinIO is running
curl http://localhost:9000/minio/health/live

# Check credentials in .env
```

### CORS errors
```bash
# Update CORS_ORIGIN in .env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## Performance Tips

- Use connection pooling (already configured in sqlx)
- Add database indexes (see schema.sql)
- Use prepared statements
- Implement caching for frequently accessed data
- Use MinIO presigned URLs for file downloads

## Security Considerations

- Use environment variables for secrets (never commit .env)
- Validate all inputs
- Use HTTPS in production
- Implement rate limiting
- Add authentication/authorization
- Use database transactions for data consistency
- Encrypt sensitive data in database

## License

MIT
