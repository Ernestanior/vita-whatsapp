# 🚀 Vercel 部署指南

## 📋 部署步骤

### 方法 1：通过 Vercel CLI（推荐）

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

选择你的登录方式（GitHub、GitLab、Bitbucket 或 Email）

#### 3. 部署项目

在项目根目录运行：

```bash
vercel
```

按照提示操作：
- Set up and deploy? **Y**
- Which scope? 选择你的账号
- Link to existing project? **N**
- What's your project's name? **vita-ai** (或其他名称)
- In which directory is your code located? **./** (默认)
- Want to override the settings? **N**

#### 4. 配置环境变量

部署完成后，需要在 Vercel Dashboard 中添加环境变量：

访问：https://vercel.com/你的用户名/vita-ai/settings/environment-variables

添加以下环境变量：

```
OPENAI_API_KEY=你的OpenAI密钥
WHATSAPP_TOKEN=你的WhatsApp令牌
WHATSAPP_PHONE_NUMBER_ID=你的电话号码ID
WHATSAPP_VERIFY_TOKEN=vita_ai_verify_token
WHATSAPP_APP_SECRET=你的应用密钥
NEXT_PUBLIC_SUPABASE_URL=你的Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
SUPABASE_SERVICE_KEY=你的Supabase服务密钥
UPSTASH_REDIS_URL=你的Redis URL
UPSTASH_REDIS_TOKEN=你的Redis令牌
NODE_ENV=production
ENABLE_CACHING=true
```

#### 5. 重新部署

配置完环境变量后，重新部署：

```bash
vercel --prod
```

---

### 方法 2：通过 GitHub + Vercel Dashboard

#### 1. 初始化 Git 仓库（如果还没有）

```bash
git init
git add .
git commit -m "Initial commit"
```

#### 2. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 创建新仓库（例如：vita-ai-health-bot）
3. 不要初始化 README、.gitignore 或 license

#### 3. 推送代码到 GitHub

```bash
git remote add origin https://github.com/你的用户名/vita-ai-health-bot.git
git branch -M main
git push -u origin main
```

#### 4. 连接 Vercel

1. 访问 https://vercel.com/new
2. 选择 "Import Git Repository"
3. 选择你的 GitHub 仓库
4. 点击 "Import"

#### 5. 配置项目

- Framework Preset: **Next.js**
- Root Directory: **./**
- Build Command: **npm run build**
- Output Directory: **.next**

#### 6. 添加环境变量

在部署前，点击 "Environment Variables"，添加所有必需的环境变量（同上）

#### 7. 部署

点击 "Deploy" 按钮开始部署

---

## 🔧 部署后配置

### 1. 获取部署 URL

部署成功后，你会得到一个 URL，类似：
```
https://vita-ai-xxx.vercel.app
```

### 2. 配置 WhatsApp Webhook

1. 访问 Meta for Developers: https://developers.facebook.com/
2. 选择你的应用
3. 进入 WhatsApp → Configuration
4. 点击 "Edit" 配置 Webhook：
   - **Callback URL**: `https://你的域名.vercel.app/api/webhook`
   - **Verify Token**: `vita_ai_verify_token`
5. 订阅 Webhook 字段：勾选 **messages**
6. 点击 "Verify and Save"

### 3. 测试 Webhook

在 Vercel 部署完成后，测试 Webhook：

```bash
curl https://你的域名.vercel.app/api/health
```

应该返回：
```json
{"status":"ok","timestamp":"..."}
```

---

## 📊 监控部署

### 查看部署日志

```bash
vercel logs
```

### 查看实时日志

```bash
vercel logs --follow
```

### 查看部署列表

```bash
vercel ls
```

---

## 🔄 更新部署

### 自动部署（GitHub 集成）

如果使用 GitHub 集成，每次推送到 main 分支都会自动部署：

```bash
git add .
git commit -m "Update feature"
git push
```

### 手动部署（CLI）

```bash
vercel --prod
```

---

## ⚠️ 常见问题

### 1. 构建失败

检查 Vercel 部署日志，通常是：
- TypeScript 错误
- 缺少环境变量
- 依赖安装失败

### 2. Webhook 验证失败

确保：
- Callback URL 正确（包含 `/api/webhook`）
- Verify Token 与 `.env` 中的 `WHATSAPP_VERIFY_TOKEN` 一致
- 应用已经成功部署

### 3. 环境变量未生效

- 在 Vercel Dashboard 中检查环境变量是否正确设置
- 重新部署项目：`vercel --prod`

---

## 🎯 下一步

部署成功后：

1. ✅ 配置 WhatsApp Webhook
2. ✅ 测试发送消息到 WhatsApp 测试号码
3. ✅ 发送食物图片测试识别功能
4. ✅ 检查 Supabase 数据库中的记录
5. ✅ 监控 Vercel 日志和错误

---

## 📞 需要帮助？

- Vercel 文档: https://vercel.com/docs
- Next.js 部署: https://nextjs.org/docs/deployment
- WhatsApp API: https://developers.facebook.com/docs/whatsapp

---

*最后更新: 2024年*
