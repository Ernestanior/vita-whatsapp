#!/bin/bash

# Vita AI Database Backup Script
# This script creates a backup of the Supabase database

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL environment variable is not set${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Starting database backup...${NC}"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/vita_ai_backup_$DATE.sql"

# Perform backup
echo -e "${YELLOW}Backing up database to $BACKUP_FILE${NC}"
pg_dump "$SUPABASE_DB_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database backup completed successfully${NC}"
else
    echo -e "${RED}✗ Database backup failed${NC}"
    exit 1
fi

# Compress backup
echo -e "${YELLOW}Compressing backup...${NC}"
gzip "$BACKUP_FILE"
COMPRESSED_FILE="$BACKUP_FILE.gz"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup compressed: $COMPRESSED_FILE${NC}"
else
    echo -e "${RED}✗ Compression failed${NC}"
    exit 1
fi

# Calculate file size
FILE_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
echo -e "${GREEN}Backup size: $FILE_SIZE${NC}"

# Upload to cloud storage (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    echo -e "${YELLOW}Uploading to S3...${NC}"
    aws s3 cp "$COMPRESSED_FILE" "s3://$AWS_S3_BUCKET/backups/$(basename $COMPRESSED_FILE)"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup uploaded to S3${NC}"
    else
        echo -e "${RED}✗ S3 upload failed${NC}"
    fi
fi

# Clean up old backups
echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "vita_ai_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Old backups cleaned up${NC}"
else
    echo -e "${YELLOW}⚠ Failed to clean up old backups${NC}"
fi

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "${GREEN}File: $COMPRESSED_FILE${NC}"
echo -e "${GREEN}Size: $FILE_SIZE${NC}"
echo -e "${GREEN}Date: $(date)${NC}"
echo -e "${GREEN}========================================${NC}"

# Send notification (optional)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✓ Database backup completed: $FILE_SIZE\"}"
fi

exit 0
