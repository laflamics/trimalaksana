# 🗑️ Clear Activity Logs from Server - Guide

## Overview
Activity logs are stored in the PostgreSQL database on the server. This guide shows you how to clear test data that has been synced to the server.

---

## 📍 Where Activity Logs Are Stored

### Local Storage (Client)
- **Key:** `activityLogs`
- **Location:** Browser localStorage / Electron storage
- **Table:** `activity_logs` (PostgreSQL)

### Server Database
- **Database:** PostgreSQL (trimalaksana)
- **Table:** `activity_logs`
- **Columns:**
  - `id` (UUID) - Log ID
  - `user_id` (VARCHAR) - User who performed action
  - `action` (VARCHAR) - Action type (CREATE, UPDATE, DELETE, LOGIN, etc)
  - `module` (VARCHAR) - Module (packaging, gt, trucking)
  - `entity_type` (VARCHAR) - Entity type (SO, Production, etc)
  - `entity_id` (UUID) - Entity ID
  - `changes` (JSONB) - Change details
  - `ip_address` (VARCHAR) - IP address
  - `user_agent` (TEXT) - Browser user agent
  - `created_at` (TIMESTAMP) - When log was created

---

## 🛠️ Method 1: Via API (Recommended)

### Quick Delete All Activity Logs
```bash
node scripts/clear-activity-logs-via-api.js --confirm
```

### Delete with Confirmation Prompt
```bash
node scripts/clear-activity-logs-via-api.js
```

### Dry Run (Preview what will be deleted)
```bash
node scripts/clear-activity-logs-via-api.js --dry-run
```

### Custom Server URL
```bash
node scripts/clear-activity-logs-via-api.js --server https://your-server.com
```

### Options
- `--server URL` - Server URL (default: http://localhost:3000)
- `--dry-run` - Show what would be deleted without actually deleting
- `--confirm` - Skip confirmation prompt

---

## 🛠️ Method 2: Direct Database Access

### Prerequisites
```bash
npm install pg
```

### Delete All Activity Logs
```bash
node scripts/clear-activity-logs-from-server.js --all --confirm
```

### Delete Logs Older Than N Days
```bash
node scripts/clear-activity-logs-from-server.js --days 7 --confirm
```

### Delete Logs for Specific User
```bash
node scripts/clear-activity-logs-from-server.js --user testuser --confirm
```

### Delete Logs for Specific Action
```bash
node scripts/clear-activity-logs-from-server.js --action CREATE --confirm
```

### Delete Logs for Specific Module
```bash
node scripts/clear-activity-logs-from-server.js --module packaging --confirm
```

### Combine Multiple Criteria
```bash
node scripts/clear-activity-logs-from-server.js --days 7 --module packaging --confirm
```

### Dry Run (Preview)
```bash
node scripts/clear-activity-logs-from-server.js --all --dry-run
```

### Options
- `--all` - Delete all activity logs
- `--days N` - Delete logs older than N days
- `--user USERNAME` - Delete logs for specific user
- `--action ACTION` - Delete logs for specific action
- `--module MODULE` - Delete logs for specific module
- `--dry-run` - Show what would be deleted without actually deleting
- `--confirm` - Skip confirmation prompt

### Environment Variables
```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trimalaksana
```

---

## 🛠️ Method 3: Direct SQL Query

### Connect to PostgreSQL
```bash
psql -U postgres -h localhost -d trimalaksana
```

### Delete All Activity Logs
```sql
DELETE FROM activity_logs;
```

### Delete Logs Older Than 7 Days
```sql
DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '7 days';
```

### Delete Logs for Specific User
```sql
DELETE FROM activity_logs WHERE user_id = 'testuser';
```

### Delete Logs for Specific Action
```sql
DELETE FROM activity_logs WHERE action = 'CREATE';
```

### Delete Logs for Specific Module
```sql
DELETE FROM activity_logs WHERE module = 'packaging';
```

### View Activity Logs Before Deleting
```sql
SELECT id, user_id, action, module, created_at 
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Count Activity Logs
```sql
SELECT COUNT(*) FROM activity_logs;
```

---

## 📊 Activity Log Structure

### Example Activity Log Entry
```json
{
  "id": "log-1234567890-abc123",
  "userId": "user123",
  "username": "testuser",
  "fullName": "Test User",
  "action": "CREATE",
  "path": "/packaging/production",
  "timestamp": "2024-02-16T10:30:00.000Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "details": {
    "entity": "Production",
    "entityId": "prod-123",
    "productionNo": "PROD-001",
    "spkNo": "SPK-001"
  }
}
```

---

## 🔄 How Activity Logs Are Synced

### Flow
1. **Client Action** → User performs action (CREATE, UPDATE, DELETE)
2. **Local Log** → Activity logged to local storage (`activityLogs` key)
3. **Server Sync** → Data synced to server via REST API
4. **Database Store** → Stored in PostgreSQL `activity_logs` table

### Sync Mechanism
- Activity logs are stored in `storage_data` table with key `activityLogs`
- When synced to server, they're also inserted into `activity_logs` table
- Both tables contain the same data

---

## ⚠️ Important Notes

### Before Deleting
1. **Backup first** - Consider backing up the database before deleting
2. **Verify criteria** - Use `--dry-run` to preview what will be deleted
3. **Confirm action** - Always confirm before deleting (unless using `--confirm`)

### After Deleting
1. **Verify deletion** - Script automatically verifies deletion
2. **Check both tables** - Activity logs may be in both `storage_data` and `activity_logs` tables
3. **Sync to clients** - Clients will sync the empty activity logs on next sync

### Deletion is Permanent
- Activity logs are permanently deleted from the database
- This action cannot be undone
- Consider archiving logs before deleting if needed for audit purposes

---

## 🐛 Troubleshooting

### Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Check if PostgreSQL is running and accessible

### Permission Error
```
Error: permission denied for schema public
```
**Solution:** Ensure database user has proper permissions

### No Records Found
```
ℹ️ No activity logs to delete
```
**Solution:** Activity logs may already be empty or criteria doesn't match any records

---

## 📝 Examples

### Clear All Test Data
```bash
# Preview what will be deleted
node scripts/clear-activity-logs-via-api.js --dry-run

# Delete all activity logs
node scripts/clear-activity-logs-via-api.js --confirm
```

### Clear Logs from Last 24 Hours
```bash
node scripts/clear-activity-logs-from-server.js --days 1 --confirm
```

### Clear Logs for Specific Test User
```bash
node scripts/clear-activity-logs-from-server.js --user testuser --confirm
```

### Clear Packaging Module Logs
```bash
node scripts/clear-activity-logs-from-server.js --module packaging --confirm
```

### Clear All CREATE Actions
```bash
node scripts/clear-activity-logs-from-server.js --action CREATE --confirm
```

---

## 🔗 Related Files

- **Activity Logger:** `src/utils/activity-logger.ts`
- **Storage Service:** `src/services/storage.ts`
- **API Handlers:** `api/handlers.go`
- **Database Schema:** `api/schema.sql`
- **Clear Script (API):** `scripts/clear-activity-logs-via-api.js`
- **Clear Script (DB):** `scripts/clear-activity-logs-from-server.js`
