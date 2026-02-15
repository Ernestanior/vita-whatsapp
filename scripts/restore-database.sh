#!/bin/bash

# Vita AI Database Restore Script
# This script restores a database backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Backup file not specified${NC}"
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 ./backups/vita_ai_backup_20240115_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL environment variable is not set${NC}"
    exit 1
fi

# Warning
echo -e "${RED}========================================${NC}"
echo -e "${RED}WARNING: DATABASE RESTORE${NC}"
echo -e "${RED}========================================${NC}"
echo -e "${YELLOW}This will OVERWRITE the current database!${NC}"
echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"
echo -e "${YELLOW}Target database: $SUPABASE_DB_URL${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

# Create a backup of current database before restore
echo -e "${YELLOW}Creating backup of current database...${NC}"
CURRENT_BACKUP="./backups/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$SUPABASE_DB_URL" > "$CURRENT_BACKUP"
gzip "$CURRENT_BACKUP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Current database backed up to: $CURRENT_BACKUP.gz${NC}"
else
    echo -e "${RED}✗ Failed to backup current database${NC}"
    exit 1
fi

# Decompress backup if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}Decompressing backup...${NC}"
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Restore database
echo -e "${YELLOW}Restoring database...${NC}"
psql "$SUPABASE_DB_URL" < "$RESTORE_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
else
    echo -e "${RED}✗ Database restore failed${NC}"
    echo -e "${YELLOW}You can restore the previous state using: $CURRENT_BACKUP.gz${NC}"
    exit 1
fi

# Clean up temporary file
if [[ "$BACKUP_FILE" == *.gz ]]; then
    rm "$TEMP_FILE"
fi

# Verify restore
echo -e "${YELLOW}Verifying restore...${NC}"
TABLE_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

if [ $TABLE_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Verification passed: $TABLE_COUNT tables found${NC}"
else
    echo -e "${RED}✗ Verification failed: No tables found${NC}"
    exit 1
fi

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Restore completed successfully!${NC}"
echo -e "${GREEN}Restored from: $BACKUP_FILE${NC}"
echo -e "${GREEN}Tables: $TABLE_COUNT${NC}"
echo -e "${GREEN}Date: $(date)${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Previous database backed up to: $CURRENT_BACKUP.gz${NC}"

# Send notification (optional)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✓ Database restored from backup: $BACKUP_FILE\"}"
fi

exit 0
