# WhatsApp Webhook 配置问题修复指南

## 问题诊断

根据 debug logs 分析，发现：
- ✅ Webhook 正常接收请求
- ✅ 消息状态更新正常（sent, delivered, read）
- ❌ **没有接收到实际的消息内容**

所有 webhook payload 都只包含 `statuses` 数组，没有 `messages` 数组。

## 根本原因

WhatsApp webhook 订阅配置不正确。当前只订阅了消息状态更新，没有订阅消息内容。

## 修复步骤

### 方法 1：通过 Meta Developers 控制台（推荐）

1. 打开 Meta for Developers
   https://developers.facebook.com/apps/1310039257567144/whatsapp-business/wa-settings/

2. 找到 "Webhook" 部分

3. 点击 "Configure webhooks" 或 "Manage"

4. 在 "Webhook fields" 中，确保勾选：
   - ✅ **messages** （这是关键！）
   - ✅ message_status （可选，用于追踪消息状态）
   - ✅ message_echoes （可选）

5. 点击 "Save" 保存配置

### 方法 2：通过 API 配置

运行以下命令：

```powershell
$token = "EAASneUiWz6gBQghlYjeV3L6ossJUMHstbRSrzyIlOy0uYNXMJx2PfwWZAkSPHVIc8jZAjbSHl2aNHPtDZB1KIa5n5mtBSf6tF5uQdLZB7r6PDxLes4IlCoEn2ZCkF2vGES73ZAQ9O5Sf32ZC0IOvZCCi6etVBZACKuasZBkDEkrzINjS0u3NbjhwO8oKKCEgMBtCuESgZDZD"
$appId = "1310039257567144"

# 订阅 messages 字段
curl -X POST "https://graph.facebook.com/v21.0/$appId/subscriptions" `
  -d "object=whatsapp_business_account" `
  -d "callback_url=https://vita-whatsapp.vercel.app/api/webhook" `
  -d "verify_token=vita_ai_verify_token" `
  -d "fields=messages,message_status" `
  -d "access_token=$token"
```

## 验证修复

修复后，发送一条测试消息 "你好"，然后检查 debug logs：

```powershell
curl -UseBasicParsing https://vita-whatsapp.vercel.app/api/debug-logs | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

应该看到：
- `hasMessages: true`
- `messageCount: 1`
- `messages` 数组包含你的消息

## 当前状态

- Webhook URL: ✅ https://vita-whatsapp.vercel.app/api/webhook
- Verification Token: ✅ vita_ai_verify_token
- Webhook 接收: ✅ 正常
- 消息订阅: ❌ **需要修复**

## 下一步

1. 按照上述方法修复 webhook 订阅
2. 发送测试消息 "你好"
3. 确认收到回复
4. 测试图片识别功能
