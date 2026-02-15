# 数据库迁移指南

本文档说明如何执行数据库迁移和管理数据库 schema 变更。

## 迁移文件

所有迁移文件位于 `migrations/` 目录：

```
migrations/
├── 001_initial_schema.sql      # 初始 schema
├── 002_enable_rls.sql          # 启用 RLS 策略
├── 003_login_logs.sql          # 登录日志表
├── verify_schema.sql           # Schema 验证
├── verify_rls.sql              # RLS 验证
└── README.md                   # 迁移说明
```

## 执行迁移

### 方法 1: 使用 Supabase CLI（推荐）

```bash
# 1. 安装 Supabase CLI
npm install -g supabase

# 2. 链接到项目
supabase link --project-ref <your-project-ref>

# 3. 推送迁移
supabase db push

# 4. 验证迁移
supabase db diff
```

### 方法 2: 使用 SQL Editor

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入项目 > SQL Editor
3. 依次执行迁移文件：

```sql
-- 1. 执行 001_initial_schema.sql
-- 创建所有表和索引

-- 2. 执行 002_enable_rls.sql
-- 启用 RLS 并创建策略

-- 3. 执行 003_login_logs.sql
-- 创建登录日志表
```

### 方法 3: 使用 psql

```bash
# 连接到数据库
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 执行迁移
\i migrations/001_initial_schema.sql
\i migrations/002_enable_rls.sql
\i migrations/003_login_logs.sql
```

## 验证迁移

### 验证 Schema

```bash
# 使用验证脚本
psql "postgresql://..." -f migrations/verify_schema.sql

# 或使用 npm 脚本
npm run verify:schema
```

预期输出：

```
✅ users table exists
✅ health_profiles table exists
✅ food_records table exists
✅ subscriptions table exists
✅ usage_quotas table exists
✅ login_logs table exists
✅ All indexes created
✅ All functions created
```

### 验证 RLS

```bash
# 使用验证脚本
psql "postgresql://..." -f migrations/verify_rls.sql

# 或使用 npm 脚本
npm run verify:rls
```

预期输出：

```
✅ RLS enabled on users
✅ RLS enabled on health_profiles
✅ RLS enabled on food_records
✅ RLS enabled on subscriptions
✅ RLS enabled on usage_quotas
✅ RLS enabled on login_logs
✅ All policies created
```

## 创建新迁移

### 1. 创建迁移文件

```bash
# 创建新迁移文件
touch migrations/004_your_migration_name.sql
```

### 2. 编写迁移 SQL

```sql
-- migrations/004_add_user_preferences.sql

-- 创建新表
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- 启用 RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view their own preferences"
ON user_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON user_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON user_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 添加注释
COMMENT ON TABLE user_preferences IS '用户偏好设置';
COMMENT ON COLUMN user_preferences.theme IS '主题（light/dark）';
COMMENT ON COLUMN user_preferences.language IS '语言（en/zh-CN/zh-TW）';
```

### 3. 测试迁移

```bash
# 在开发环境测试
supabase db reset
supabase db push

# 验证表结构
psql "postgresql://..." -c "\d user_preferences"
```

### 4. 创建回滚脚本

```sql
-- migrations/004_add_user_preferences_rollback.sql

-- 删除策略
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;

-- 删除表
DROP TABLE IF EXISTS user_preferences;
```

## 迁移最佳实践

### 1. 使用事务

```sql
BEGIN;

-- 迁移操作
CREATE TABLE ...;
CREATE INDEX ...;

-- 验证
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'your_table') THEN
    RAISE EXCEPTION 'Table creation failed';
  END IF;
END $$;

COMMIT;
```

### 2. 添加注释

```sql
COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.phone_number IS '用户手机号（E.164 格式）';
```

### 3. 使用 IF NOT EXISTS

```sql
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
```

### 4. 保持向后兼容

```sql
-- ❌ 不要直接删除列
ALTER TABLE users DROP COLUMN old_column;

-- ✅ 先标记为废弃，下个版本再删除
ALTER TABLE users ALTER COLUMN old_column SET DEFAULT NULL;
COMMENT ON COLUMN users.old_column IS 'DEPRECATED: Use new_column instead';
```

### 5. 添加默认值

```sql
-- 为新列添加默认值，避免破坏现有数据
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
```

## 常见迁移场景

### 添加新列

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 修改列类型

```sql
-- 方法 1: 直接修改（如果兼容）
ALTER TABLE users ALTER COLUMN age TYPE INTEGER USING age::INTEGER;

-- 方法 2: 创建新列，迁移数据，删除旧列
ALTER TABLE users ADD COLUMN age_new INTEGER;
UPDATE users SET age_new = age::INTEGER;
ALTER TABLE users DROP COLUMN age;
ALTER TABLE users RENAME COLUMN age_new TO age;
```

### 添加外键

```sql
-- 添加外键约束
ALTER TABLE food_records 
ADD CONSTRAINT fk_food_records_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### 创建复合索引

```sql
-- 为常用查询创建复合索引
CREATE INDEX IF NOT EXISTS idx_food_records_user_date 
ON food_records(user_id, created_at DESC);
```

### 添加检查约束

```sql
-- 添加数据验证约束
ALTER TABLE health_profiles 
ADD CONSTRAINT check_age_range 
CHECK (age >= 0 AND age <= 150);

ALTER TABLE health_profiles 
ADD CONSTRAINT check_height_range 
CHECK (height_cm >= 50 AND height_cm <= 300);
```

## 数据迁移

### 迁移现有数据

```sql
-- 示例：将旧格式的电话号码转换为 E.164 格式
UPDATE users 
SET phone_number = '+65' || phone_number 
WHERE phone_number NOT LIKE '+%';

-- 示例：填充新列的默认值
UPDATE users 
SET status = 'active' 
WHERE status IS NULL;
```

### 批量数据迁移

```sql
-- 使用 DO 块进行批量迁移
DO $$
DECLARE
  batch_size INTEGER := 1000;
  offset_val INTEGER := 0;
  rows_affected INTEGER;
BEGIN
  LOOP
    UPDATE users 
    SET normalized_phone = regexp_replace(phone_number, '[^0-9+]', '', 'g')
    WHERE id IN (
      SELECT id FROM users 
      WHERE normalized_phone IS NULL 
      LIMIT batch_size
    );
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    EXIT WHEN rows_affected = 0;
    
    RAISE NOTICE 'Migrated % rows', rows_affected;
    COMMIT;
  END LOOP;
END $$;
```

## 回滚迁移

### 自动回滚

```sql
-- 使用事务自动回滚
BEGIN;

-- 迁移操作
ALTER TABLE users ADD COLUMN new_column VARCHAR(255);

-- 如果出错，自动回滚
-- 如果成功，手动提交
COMMIT;
```

### 手动回滚

```bash
# 执行回滚脚本
psql "postgresql://..." -f migrations/004_add_user_preferences_rollback.sql
```

## 生产环境迁移

### 迁移前检查

- [ ] 在开发环境测试迁移
- [ ] 在预发布环境测试迁移
- [ ] 创建数据库备份
- [ ] 准备回滚脚本
- [ ] 通知团队维护窗口
- [ ] 检查迁移对性能的影响

### 执行迁移

```bash
# 1. 创建备份
pg_dump "postgresql://..." > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 执行迁移
psql "postgresql://..." -f migrations/004_your_migration.sql

# 3. 验证迁移
psql "postgresql://..." -f migrations/verify_migration.sql

# 4. 监控应用
# 检查错误日志和性能指标
```

### 迁移后验证

```bash
# 运行集成测试
npm run test:integration

# 检查数据完整性
npm run verify:data

# 监控性能
npm run test:performance
```

## 故障排查

### 迁移失败

```sql
-- 检查错误日志
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- 检查锁
SELECT * FROM pg_locks WHERE NOT granted;

-- 终止阻塞的查询
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...;
```

### RLS 策略问题

```sql
-- 检查 RLS 状态
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 检查策略
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- 测试策略
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';
SELECT * FROM users; -- 应该只返回该用户的数据
RESET ROLE;
```

### 性能问题

```sql
-- 检查慢查询
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- 检查缺失的索引
SELECT schemaname, tablename, attname 
FROM pg_stats 
WHERE schemaname = 'public' 
AND n_distinct > 100 
AND correlation < 0.1;

-- 分析表
ANALYZE users;
ANALYZE food_records;
```

## 参考资料

- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
