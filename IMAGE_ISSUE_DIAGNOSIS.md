# 🔍 图片识别问题诊断报告

**问题**: 发送图片到 WhatsApp 没有任何反应  
**时间**: 2026-02-17  
**用户**: +65 8315 3431

---

## 🚨 问题分析

### 症状:
- 发送文本消息 ✅ 正常工作
- 发送图片消息 ❌ 没有任何反应
- 没有收到确认消息
- 没有收到识别结果

### 可能的原因:

#### 1. Webhook 没有收到消息 (最可能)
**证据**:
- Vercel logs 显示: "No logs found"
- 说明 WhatsApp 根本没有发送消息到我们的服务器

**原因**:
- WhatsApp webhook URL 配置错误
- WhatsApp webhook 验证失败
- WhatsApp 权限配置问题

#### 2. 图片下载失败
**证据**: 需要测试
**原因**: WhatsApp Media API 权限问题

#### 3. OpenAI API 问题
**证据**: 需要测试
**原因**: API key 无效或配额用完

---

## 🔧 诊断步骤

### 步骤 1: 检查 Webhook 配置

**WhatsApp Business 配置**:
1. 登录 Meta for Developers
2. 进入你的 WhatsApp App
3. 检查 Webhook 配置:
   - Callback URL: `https://vita-whatsapp.vercel.app/api/webhook`
   - Verify Token: `vita_ai_verify_token`
   - 订阅字段: `messages`

**验证方法**:
```bash
# 测试 webhook 验证
curl "https://vita-whatsapp.vercel.app/api/webhook?hub.mode=subscribe&hub.verify_token=vita_ai_verify_token&hub.challenge=test123"

# 应该返回: test123
```

### 步骤 2: 检查 WhatsApp 权限

需要确保以下权限已启用:
- ✅ `whatsapp_business_messaging` - 发送和接收消息
- ✅ `whatsapp_business_management` - 管理 WhatsApp Business 账号

### 步骤 3: 测试图片下载

运行测试端点:
```powershell
Invoke-WebRequest -Uri "https://vita-whatsapp.vercel.app/api/test-webhook-image" -Method POST -TimeoutSec 120
```

这会模拟完整的图片处理流程。

### 步骤 4: 检查 OpenAI API

验证 API key:
```powershell
# 在 .env 文件中检查
OPENAI_API_KEY='sk-proj-...'
```

---

## 🎯 解决方案

### 方案 1: 重新配置 Webhook (推荐)

1. **登录 Meta for Developers**
   - 访问: https://developers.facebook.com/
   - 选择你的 WhatsApp App

2. **配置 Webhook**
   - 进入 "WhatsApp" > "Configuration"
   - 点击 "Edit" Webhook
   - 输入:
     - Callback URL: `https://vita-whatsapp.vercel.app/api/webhook`
     - Verify Token: `vita_ai_verify_token`
   - 点击 "Verify and Save"

3. **订阅消息事件**
   - 在 "Webhook fields" 中
   - 确保 "messages" 已勾选
   - 点击 "Subscribe"

4. **测试**
   - 发送一条文本消息到 +65 8315 3431
   - 应该收到回复
   - 发送一张图片
   - 应该收到识别结果

### 方案 2: 检查 WhatsApp Token

你的 token 可能过期了。需要生成新的永久 token:

1. 进入 Meta for Developers
2. 选择你的 App
3. 进入 "WhatsApp" > "API Setup"
4. 点击 "Generate Token"
5. 选择权限:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. 复制新 token
7. 更新 `.env` 文件:
   ```
   WHATSAPP_TOKEN='新的token'
   ```
8. 重新部署:
   ```bash
   git add .env
   git commit -m "Update WhatsApp token"
   git push
   ```

### 方案 3: 手动测试 Webhook

创建一个测试脚本来模拟 WhatsApp 发送消息:

```powershell
# 测试文本消息
$body = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            changes = @(
                @{
                    field = "messages"
                    value = @{
                        messages = @(
                            @{
                                from = "6583153431"
                                id = "test_msg_123"
                                timestamp = "1234567890"
                                type = "text"
                                text = @{
                                    body = "/start"
                                }
                            }
                        )
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "https://vita-whatsapp.vercel.app/api/webhook" -Method POST -Body $body -ContentType "application/json"
```

---

## 📊 测试清单

### Webhook 配置测试:
- [ ] Webhook URL 正确
- [ ] Verify Token 正确
- [ ] Webhook 验证成功
- [ ] 订阅了 "messages" 事件

### 权限测试:
- [ ] WhatsApp Business Messaging 权限
- [ ] WhatsApp Business Management 权限
- [ ] Token 有效且未过期

### 功能测试:
- [ ] 文本消息工作正常
- [ ] 图片消息被接收
- [ ] 图片下载成功
- [ ] OpenAI API 调用成功
- [ ] 识别结果返回

---

## 🚀 快速修复步骤

### 如果你现在就想修复:

1. **检查 Webhook 配置** (5分钟)
   - 登录 Meta for Developers
   - 验证 Callback URL 和 Token
   - 确保订阅了 "messages"

2. **测试 Webhook** (2分钟)
   ```bash
   curl "https://vita-whatsapp.vercel.app/api/webhook?hub.mode=subscribe&hub.verify_token=vita_ai_verify_token&hub.challenge=test123"
   ```

3. **发送测试消息** (1分钟)
   - 发送文本: "/start"
   - 应该收到回复

4. **发送测试图片** (1分钟)
   - 发送任意食物照片
   - 应该收到识别结果

### 如果还是不工作:

5. **查看 Vercel 日志** (2分钟)
   ```bash
   vercel logs --since 5m
   ```

6. **运行诊断测试** (5分钟)
   ```powershell
   Invoke-WebRequest -Uri "https://vita-whatsapp.vercel.app/api/test-webhook-image" -Method POST -TimeoutSec 120
   ```

---

## 💡 我的建议

基于我的分析，问题最可能是:

1. **Webhook 配置问题** (90% 可能性)
   - WhatsApp 没有正确配置 webhook URL
   - 或者 webhook 验证失败
   - 解决方案: 重新配置 webhook

2. **Token 过期** (5% 可能性)
   - WhatsApp token 可能过期了
   - 解决方案: 生成新的永久 token

3. **代码问题** (5% 可能性)
   - 图片处理代码有 bug
   - 解决方案: 运行测试端点诊断

---

## 📞 需要我帮助的地方

我可以帮你:

1. ✅ 创建测试端点来诊断问题
2. ✅ 分析日志找出错误
3. ✅ 修复代码中的 bug
4. ❌ 访问你的 Meta for Developers 账号
5. ❌ 配置 WhatsApp webhook (需要你的权限)

**你需要做的**:
1. 登录 Meta for Developers
2. 检查 webhook 配置
3. 告诉我你看到了什么
4. 我会帮你修复

---

## 🎯 下一步行动

### 立即执行:

1. **登录 Meta for Developers**
   - https://developers.facebook.com/

2. **检查 Webhook 配置**
   - 进入你的 WhatsApp App
   - 查看 "Configuration" 页面
   - 截图发给我

3. **告诉我你看到了什么**
   - Callback URL 是什么?
   - Verify Token 是什么?
   - 订阅了哪些事件?

4. **我会立即帮你修复**

---

**状态**: 🔍 等待诊断  
**优先级**: ⭐⭐⭐⭐⭐ 最高  
**预计修复时间**: 10分钟  

**让我们一起解决这个问题！** 🚀
