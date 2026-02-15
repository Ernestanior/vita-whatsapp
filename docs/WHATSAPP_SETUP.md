# WhatsApp Business API 配置指南

完整的 WhatsApp Business API 设置和配置指南。

## 目录

1. [前置准备](#前置准备)
2. [创建 Meta App](#创建-meta-app)
3. [配置 WhatsApp Business](#配置-whatsapp-business)
4. [Webhook 配置](#webhook-配置)
5. [测试和验证](#测试和验证)
6. [生产环境配置](#生产环境配置)
7. [故障排查](#故障排查)

## 前置准备

### 所需账号

- Meta Business Account
- Meta Developer Account
- 验证的 Facebook Business Manager

### 准备材料

- 业务电话号码（用于 WhatsApp Business）
- 业务邮箱
- 业务网站
- 公司信息

## 创建 Meta App

### 1. 访问 Meta for Developers

访问 [Meta for Developers](https://developers.facebook.com) 并登录

### 2. 创建新应用

1. 点击 "My Apps" > "Create App"
2. 选择应用类型: **Business**
3. 填写应用信息：
   ```
   App Name: Vita AI
   App Contact Email: your-email@example.com
   Business Account: 选择您的 Business Account
   ```
4. 点击 "Create App"

### 3. 添加 WhatsApp 产品

1. 在应用 Dashboard 中找到 "Add Products"
2. 找到 "WhatsApp" 并点击 "Set Up"
3. 选择或创建 WhatsApp Business Account

## 配置 WhatsApp Business

### 1. 获取测试号码

Meta 提供免费的测试号码用于开发：

1. 在 WhatsApp > Getting Started 中
2. 查看 "Test number" 部分
3. 记录测试号码（格式：+1 555 XXX XXXX）

### 2. 添加接收号码

在测试阶段，需要添加接收号码：

1. 在 "To" 字段输入您的手机号（包含国家代码）
2. 点击 "Send code"
3. 在手机上接收验证码
4. 输入验证码并验证

### 3. 发送测试消息

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "YOUR_PHONE_NUMBER",
    "type": "text",
    "text": {
      "body": "Hello from Vita AI!"
    }
  }'
```

### 4. 获取访问令牌

#### 临时令牌（开发用）

1. 在 WhatsApp > API Setup 中
2. 复制 "Temporary access token"
3. 有效期：24 小时

#### 永久令牌（生产用）

1. 在 Business Settings > System Users 中
2. 点击 "Add" 创建 System User
3. 填写信息：
   ```
   Name: Vita AI System User
   Role: Admin
   ```
4. 点击 "Add Assets"
5. 选择 WhatsApp Accounts
6. 分配权限：
   - Manage WhatsApp Business Account
   - Manage WhatsApp Business Messages
7. 点击 "Generate New Token"
8. 选择权限：
   - whatsapp_business_management
   - whatsapp_business_messaging
9. 复制并保存令牌

### 5. 获取 Phone Number ID

1. 在 WhatsApp > API Setup 中
2. 找到 "Phone number ID"
3. 复制 ID（格式：123456789012345）

## Webhook 配置

### 1. 准备 Webhook 端点

确保您的应用已部署并可访问：

```
Webhook URL: https://your-domain.com/api/webhook
```

### 2. 生成 Verify Token

```bash
# 生成随机 token
openssl rand -base64 32
```

保存此 token 到环境变量 `WHATSAPP_VERIFY_TOKEN`

### 3. 配置 Webhook

1. 在 WhatsApp > Configuration 中
2. 点击 "Edit" Webhook
3. 填写信息：
   ```
   Callback URL: https://your-domain.com/api/webhook
   Verify Token: <your-generated-token>
   ```
4. 点击 "Verify and Save"

### 4. 订阅 Webhook 字段

选择以下字段：

- ✅ **messages**: 接收用户消息
- ✅ **message_status**: 接收消息状态更新

### 5. 验证 Webhook

Meta 会发送 GET 请求验证 Webhook：

```
GET /api/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
```

您的端点应返回 `CHALLENGE_STRING`

## 测试和验证

### 1. 测试消息接收

发送消息到 WhatsApp 测试号码：

```
1. 打开 WhatsApp
2. 发送消息到测试号码
3. 检查 Webhook 是否收到消息
```

### 2. 测试消息发送

```bash
# 使用 curl 测试
curl -X POST \
  "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "$YOUR_PHONE",
    "type": "text",
    "text": {
      "body": "Test message"
    }
  }'
```

### 3. 测试图片接收

```
1. 发送图片到 WhatsApp 号码
2. 检查 Webhook 是否收到图片消息
3. 验证图片下载功能
```

### 4. 测试交互式消息

```bash
# 发送带按钮的消息
curl -X POST \
  "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "$YOUR_PHONE",
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "Would you like to save this food record?"
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "save",
              "title": "Save"
            }
          },
          {
            "type": "reply",
            "reply": {
              "id": "discard",
              "title": "Discard"
            }
          }
        ]
      }
    }
  }'
```

## 生产环境配置

### 1. 申请官方号码

测试号码只能发送给已验证的号码。生产环境需要官方号码：

1. 在 WhatsApp > Phone Numbers 中
2. 点击 "Add phone number"
3. 选择方式：
   - **新号码**: 从 Meta 购买
   - **现有号码**: 迁移现有 WhatsApp Business 号码

### 2. 验证业务信息

Meta 需要验证您的业务：

1. 提供业务文件（营业执照等）
2. 验证业务网站
3. 等待审核（通常 1-3 个工作日）

### 3. 配置消息模板

生产环境需要预先批准的消息模板：

1. 在 WhatsApp > Message Templates 中
2. 点击 "Create Template"
3. 填写模板信息：

**欢迎消息模板**
```
Name: welcome_message
Category: UTILITY
Language: English
Body: Welcome to Vita AI! 👋 I'm your AI health assistant. Send me a photo of your food and I'll analyze its nutritional value.
```

**每日总结模板**
```
Name: daily_digest
Category: UTILITY
Language: English
Body: 📊 Your Daily Health Summary

Today's Stats:
- Meals logged: {{1}}
- Total calories: {{2}}
- Health score: {{3}}

{{4}}

Keep up the great work! 💪
```

4. 提交审核
5. 等待批准（通常 24 小时内）

### 4. 配置业务资料

1. 在 WhatsApp > Profile 中
2. 填写业务信息：
   ```
   Business Name: Vita AI
   About: Your AI-powered health assistant for food tracking
   Description: Track your meals, get instant nutritional analysis, and receive personalized health insights.
   Website: https://your-domain.com
   Email: support@your-domain.com
   Address: Your business address
   ```
3. 上传 Profile Photo（建议 640x640 px）

### 5. 配置自动回复

1. 在 WhatsApp > Tools > Automated Messages 中
2. 配置：
   - **Away Message**: 当您不在线时
   - **Greeting Message**: 用户首次联系时

### 6. 升级到 Business API

1. 在 WhatsApp > Getting Started 中
2. 点击 "Upgrade to Business API"
3. 选择定价计划
4. 完成支付设置

## 消息类型

### 文本消息

```json
{
  "messaging_product": "whatsapp",
  "to": "PHONE_NUMBER",
  "type": "text",
  "text": {
    "body": "Your message here"
  }
}
```

### 图片消息

```json
{
  "messaging_product": "whatsapp",
  "to": "PHONE_NUMBER",
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Image caption"
  }
}
```

### 交互式按钮

```json
{
  "messaging_product": "whatsapp",
  "to": "PHONE_NUMBER",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Choose an option"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "option1",
            "title": "Option 1"
          }
        }
      ]
    }
  }
}
```

### 列表消息

```json
{
  "messaging_product": "whatsapp",
  "to": "PHONE_NUMBER",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": {
      "type": "text",
      "text": "Choose a meal"
    },
    "body": {
      "text": "Select from your recent meals"
    },
    "action": {
      "button": "View Meals",
      "sections": [
        {
          "title": "Recent Meals",
          "rows": [
            {
              "id": "meal1",
              "title": "Chicken Rice",
              "description": "500 cal"
            }
          ]
        }
      ]
    }
  }
}
```

## 限制和配额

### 消息限制

- **测试号码**: 每天最多 250 条消息
- **官方号码**: 根据定价计划

### 速率限制

- **每秒**: 80 条消息
- **每分钟**: 1000 条消息

### 媒体文件限制

- **图片**: 最大 5 MB
- **视频**: 最大 16 MB
- **文档**: 最大 100 MB

## 故障排查

### Webhook 验证失败

**问题**: Webhook 验证失败

**解决方案**:
```bash
# 1. 检查 Verify Token
echo $WHATSAPP_VERIFY_TOKEN

# 2. 测试 Webhook 端点
curl "https://your-domain.com/api/webhook?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=test"

# 3. 检查日志
vercel logs
```

### 消息发送失败

**问题**: 消息发送返回错误

**常见错误码**:

- **100**: Invalid parameter
- **131031**: Account is restricted
- **131047**: Re-engagement message
- **131051**: Unsupported message type
- **133000**: Rate limit exceeded

**解决方案**:
```bash
# 检查访问令牌
curl -X GET \
  "https://graph.facebook.com/v18.0/debug_token?input_token=$ACCESS_TOKEN&access_token=$ACCESS_TOKEN"

# 检查号码状态
curl -X GET \
  "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 图片下载失败

**问题**: 无法下载用户发送的图片

**解决方案**:
```bash
# 1. 获取媒体 URL
curl -X GET \
  "https://graph.facebook.com/v18.0/$MEDIA_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 2. 下载媒体
curl -X GET \
  "$MEDIA_URL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -o image.jpg
```

### Webhook 未收到消息

**问题**: 发送消息后 Webhook 未触发

**检查清单**:
- [ ] Webhook URL 是否正确
- [ ] Webhook 字段是否已订阅
- [ ] 应用是否在开发模式
- [ ] 号码是否已验证
- [ ] 防火墙是否阻止

**解决方案**:
```bash
# 检查 Webhook 订阅
curl -X GET \
  "https://graph.facebook.com/v18.0/$WHATSAPP_BUSINESS_ACCOUNT_ID/subscribed_apps" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 重新订阅
curl -X POST \
  "https://graph.facebook.com/v18.0/$WHATSAPP_BUSINESS_ACCOUNT_ID/subscribed_apps" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## 最佳实践

### 1. 消息模板

- 使用预批准的模板
- 保持消息简洁
- 包含明确的 CTA

### 2. 响应时间

- 24 小时内回复用户消息
- 使用自动回复处理常见问题

### 3. 用户体验

- 提供清晰的命令说明
- 使用交互式按钮简化操作
- 发送确认消息

### 4. 错误处理

- 捕获并记录所有错误
- 向用户发送友好的错误消息
- 实现重试机制

### 5. 安全

- 验证 Webhook 签名
- 使用 HTTPS
- 定期轮换访问令牌
- 不要在日志中记录敏感信息

## 监控和分析

### 1. 消息指标

在 WhatsApp > Insights 中查看：

- 发送的消息数
- 接收的消息数
- 消息送达率
- 消息阅读率

### 2. 错误监控

```typescript
// 记录 WhatsApp API 错误
logger.error('WhatsApp API error', {
  error: error.message,
  code: error.code,
  phoneNumber: phoneNumber,
  messageType: messageType,
});

// 发送告警
if (error.code === 131031) {
  // 账号受限，发送紧急告警
  await sendAlert('WhatsApp account restricted');
}
```

### 3. 性能监控

```typescript
// 记录消息发送时间
const startTime = Date.now();
await sendWhatsAppMessage(message);
const duration = Date.now() - startTime;

logger.info('WhatsApp message sent', {
  duration,
  messageType: message.type,
});
```

## 参考资料

- [WhatsApp Business API 文档](https://developers.facebook.com/docs/whatsapp)
- [Cloud API 快速开始](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [消息模板指南](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook 参考](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [错误代码](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)

## 支持

如需帮助：

- [WhatsApp Business 支持](https://business.whatsapp.com/support)
- [Meta for Developers 社区](https://developers.facebook.com/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/whatsapp-business-api)
