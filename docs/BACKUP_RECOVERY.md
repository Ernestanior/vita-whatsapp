# 备份和恢复指南

本文档说明如何配置和执行数据备份与恢复。

## 备份策略

### 自动备份

#### Supabase 自动备份

**配置步骤**:
1. 登录 Supabase Dashboard
2. 进入 Database > Backups
3. 启用自动备份
4. 配置保留期（建议 30 天）

**备份频率**:
- 每日自动备份
- 保留最近 30 天的备份
- 每周完整备份

#### 手动备份脚本

**配置环境变量**:
```bash
# .env.backup
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
AWS_S3_BUCKET=your-backup-bucket (可选)
SLACK_WEBHOOK_URL=your-slack-webhook (可选)
```

**运行备份**:
```bash
# 赋予执行权限
chmod +x scripts/backup-database.sh

# 加载环境变量
source .env.backup

# 执行备份
./scripts/backup-database.sh
```

**预期输出**:
```
Starting database backup...
Backing up database to ./backups/vita_ai_backup_20240115_120000.sql
✓ Database backup completed successfully
Compressing backup...
✓ Backup compressed: ./backups/vita_ai_backup_20240115_120000.sql.gz
Backup size: 2.5M
Uploading to S3...
✓ Backup uploaded to S3
Cleaning up old backups (older than 30 days)...
✓ Old backups cleaned up
========================================
Backup completed successfully!
File: ./backups/vita_ai_backup_20240115_120000.sql.gz
Size: 2.5M
Date: Mon Jan 15 12:00:00 SGT 2024
========================================
```

### 定时备份

#### 使用 Cron (Linux/Mac)

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨 3 点）
0 3 * * * cd /path/to/vita-ai && source .env.backup && ./scripts/backup-database.sh >> /var/log/vita-ai-backup.log 2>&1
```

#### 使用 Task Scheduler (Windows)

1. 打开任务计划程序
2. 创建基本任务
3. 触发器: 每天凌晨 3:00
4. 操作: 启动程序
   - 程序: `bash`
   - 参数: `/path/to/scripts/backup-database.sh`
5. 完成

#### 使用 GitHub Actions

创建 `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 19 * * *' # 每天 3:00 SGT (19:00 UTC)
  workflow_dispatch: # 允许手动触发

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup PostgreSQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Run backup
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
          AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          chmod +x scripts/backup-database.sh
          ./scripts/backup-database.sh

      - name: Upload backup artifact
        uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: backups/*.sql.gz
          retention-days: 30
```

## 数据恢复

### 恢复流程

#### 1. 准备恢复

**检查清单**:
- [ ] 确认备份文件完整
- [ ] 通知团队维护窗口
- [ ] 停止应用流量（可选）
- [ ] 创建当前数据库备份

#### 2. 执行恢复

```bash
# 赋予执行权限
chmod +x scripts/restore-database.sh

# 加载环境变量
source .env.backup

# 执行恢复
./scripts/restore-database.sh ./backups/vita_ai_backup_20240115_120000.sql.gz
```

**交互式确认**:
```
========================================
WARNING: DATABASE RESTORE
========================================
This will OVERWRITE the current database!
Backup file: ./backups/vita_ai_backup_20240115_120000.sql.gz
Target database: postgresql://...

Are you sure you want to continue? (yes/no): yes
```

**预期输出**:
```
Creating backup of current database...
✓ Current database backed up to: ./backups/pre_restore_backup_20240115_130000.sql.gz
Decompressing backup...
Restoring database...
✓ Database restored successfully
Verifying restore...
✓ Verification passed: 6 tables found
========================================
Restore completed successfully!
Restored from: ./backups/vita_ai_backup_20240115_120000.sql.gz
Tables: 6
Date: Mon Jan 15 13:00:00 SGT 2024
========================================
Previous database backed up to: ./backups/pre_restore_backup_20240115_130000.sql.gz
```

#### 3. 验证恢复

```bash
# 运行验证脚本
npm run verify:schema
npm run verify:rls

# 检查数据完整性
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM users"
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM food_records"

# 运行集成测试
npm run test:integration
```

#### 4. 恢复服务

```bash
# 重新部署应用
vercel --prod

# 监控错误
vercel logs --follow

# 检查健康状态
curl https://your-domain.com/api/health
```

### 部分恢复

#### 恢复单个表

```bash
# 从备份中提取单个表
pg_restore -t users backup.sql > users_only.sql

# 恢复单个表
psql "$SUPABASE_DB_URL" < users_only.sql
```

#### 恢复特定数据

```sql
-- 恢复特定用户的数据
COPY (
  SELECT * FROM food_records_backup
  WHERE user_id = 'specific-user-id'
) TO STDOUT | psql "$SUPABASE_DB_URL" -c "COPY food_records FROM STDIN"
```

## 灾难恢复

### 完整灾难恢复流程

#### 场景：Supabase 项目完全丢失

**步骤 1: 创建新 Supabase 项目**
```bash
# 1. 在 Supabase Dashboard 创建新项目
# 2. 记录新的项目 URL 和密钥
```

**步骤 2: 恢复数据库**
```bash
# 设置新的数据库 URL
export SUPABASE_DB_URL="postgresql://postgres:[NEW-PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres"

# 恢复最新备份
./scripts/restore-database.sh ./backups/latest_backup.sql.gz
```

**步骤 3: 恢复 Storage**
```bash
# 如果有 Storage 备份
# 1. 创建 bucket
# 2. 上传文件
aws s3 sync s3://backup-bucket/storage/ supabase-storage://food-images/
```

**步骤 4: 更新应用配置**
```bash
# 更新 Vercel 环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# 重新部署
vercel --prod
```

**步骤 5: 验证和测试**
```bash
# 运行完整测试套件
npm run test:all

# 手动测试关键功能
# 1. 用户登录
# 2. 食物识别
# 3. 历史记录查看
# 4. 支付流程
```

**步骤 6: 通知用户**
```
发送通知给所有用户：
"我们刚刚完成了系统维护。如有任何问题，请联系支持团队。"
```

### RTO 和 RPO

**Recovery Time Objective (RTO)**:
- 目标: 4 小时
- 关键服务: 2 小时

**Recovery Point Objective (RPO)**:
- 目标: 24 小时
- 关键数据: 1 小时

## 备份验证

### 定期验证

**每周验证**:
```bash
#!/bin/bash
# scripts/verify-backup.sh

# 1. 下载最新备份
LATEST_BACKUP=$(ls -t backups/*.sql.gz | head -1)

# 2. 创建测试数据库
createdb test_restore

# 3. 恢复到测试数据库
gunzip -c "$LATEST_BACKUP" | psql test_restore

# 4. 验证数据
TABLE_COUNT=$(psql test_restore -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

if [ $TABLE_COUNT -gt 0 ]; then
    echo "✓ Backup verification passed"
else
    echo "✗ Backup verification failed"
    exit 1
fi

# 5. 清理
dropdb test_restore
```

**自动化验证**:
```yaml
# .github/workflows/verify-backup.yml
name: Verify Backup

on:
  schedule:
    - cron: '0 4 * * 0' # 每周日凌晨 4 点
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Download latest backup
        run: |
          aws s3 cp s3://${{ secrets.AWS_S3_BUCKET }}/backups/latest.sql.gz .

      - name: Verify backup
        run: |
          chmod +x scripts/verify-backup.sh
          ./scripts/verify-backup.sh
```

## 备份监控

### 监控指标

**关键指标**:
- 备份成功率 (目标: 100%)
- 备份大小趋势
- 备份时间
- 存储使用量

**告警规则**:
```typescript
// 备份失败告警
if (backupFailed) {
  await sendAlert({
    type: 'backup_failed',
    severity: 'critical',
    message: 'Database backup failed',
  });
}

// 备份大小异常告警
if (backupSize > previousSize * 2) {
  await sendAlert({
    type: 'backup_size_anomaly',
    severity: 'warning',
    message: `Backup size increased significantly: ${backupSize}`,
  });
}
```

### 备份日志

**日志位置**:
```
/var/log/vita-ai-backup.log
```

**日志格式**:
```
2024-01-15 03:00:00 [INFO] Starting backup
2024-01-15 03:00:15 [INFO] Backup completed: 2.5M
2024-01-15 03:00:20 [INFO] Uploaded to S3
2024-01-15 03:00:25 [INFO] Cleanup completed
```

**日志分析**:
```bash
# 查看最近的备份
tail -n 50 /var/log/vita-ai-backup.log

# 查找失败的备份
grep "ERROR" /var/log/vita-ai-backup.log

# 统计备份大小趋势
grep "Backup size" /var/log/vita-ai-backup.log | awk '{print $NF}'
```

## 最佳实践

### 备份

1. **3-2-1 规则**
   - 3 份副本
   - 2 种不同介质
   - 1 份异地存储

2. **加密备份**
   ```bash
   # 加密备份
   gpg --encrypt --recipient your-email@example.com backup.sql.gz
   
   # 解密备份
   gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
   ```

3. **测试恢复**
   - 每月测试恢复流程
   - 记录恢复时间
   - 验证数据完整性

4. **文档化**
   - 记录备份位置
   - 记录恢复步骤
   - 更新联系人信息

### 恢复

1. **评估影响**
   - 确定数据丢失范围
   - 评估恢复时间
   - 通知相关人员

2. **选择备份**
   - 选择最近的完整备份
   - 验证备份完整性
   - 确认备份时间点

3. **执行恢复**
   - 创建当前状态备份
   - 在测试环境验证
   - 执行生产恢复

4. **验证和监控**
   - 运行完整测试
   - 监控错误日志
   - 验证用户访问

## 故障排查

### 备份失败

**问题**: 备份脚本失败

**检查**:
```bash
# 检查磁盘空间
df -h

# 检查数据库连接
psql "$SUPABASE_DB_URL" -c "SELECT 1"

# 检查权限
ls -la backups/
```

**解决**:
```bash
# 清理磁盘空间
rm -f backups/old_*.sql.gz

# 修复权限
chmod 755 backups/
chmod +x scripts/backup-database.sh
```

### 恢复失败

**问题**: 恢复过程中断

**检查**:
```bash
# 检查备份文件
gunzip -t backup.sql.gz

# 检查数据库连接
psql "$SUPABASE_DB_URL" -c "SELECT 1"

# 检查日志
tail -f /var/log/postgresql/postgresql.log
```

**解决**:
```bash
# 重新下载备份
aws s3 cp s3://bucket/backup.sql.gz .

# 清理部分恢复
psql "$SUPABASE_DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 重新执行恢复
./scripts/restore-database.sh backup.sql.gz
```

## 联系支持

如需帮助：
- 📧 Email: ops@vitaai.com
- 💬 Slack: #ops-backup
- 📞 紧急: +65-xxxx-xxxx

---

**重要提示**: 定期测试备份和恢复流程，确保在真正需要时能够成功恢复数据。
