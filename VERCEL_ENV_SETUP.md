# Vercel 环境变量设置

## 需要添加的环境变量

在 Vercel Dashboard 中添加以下环境变量：

### 1. 访问 Vercel Dashboard

https://vercel.com/erns-projects-618a242e/vita-whatsapp/settings/environment-variables

### 2. 添加 GOOGLE_AI_API_KEY

```
Name: GOOGLE_AI_API_KEY
Value: AIzaSyBkpJOFZV8vAHen1ir2KDvadHwp0OCn9Cw
Environment: Production, Preview, Development
```

### 3. 重新部署

添加环境变量后，需要重新部署：

方法1：在 Vercel Dashboard 点击 "Redeploy"
方法2：推送新的 commit 触发自动部署

## 测试步骤

部署完成后（约2分钟），运行以下测试：

### 1. 测试 Gemini vs GPT 对比
```bash
curl https://vita-whatsapp.vercel.app/api/test-gemini-vs-gpt
```

### 2. 测试自然语言命令
```bash
curl https://vita-whatsapp.vercel.app/api/test-natural-language
```

然后在 WhatsApp 上发送：
- "我想看一下数据分析"
- "我最近吃了什么"
- "我的个人信息"

### 3. 检查日志
```bash
curl https://vita-whatsapp.vercel.app/api/debug-logs | grep gemini_intent
```

## 预期结果

✅ Gemini 2.0 Flash 作为主要模型
✅ GPT-4o-mini 作为备用
✅ 准确度：95%+
✅ 响应时间：800-2000ms
✅ 成本：每次 ~$0.00001

## 本地测试结果

```
Model: gemini-2.0-flash
Total tests: 7
✅ Successful: 7
❌ Failed: 0
⏱️  Average response time: 1358ms
💰 Estimated cost: ~$0.00001 per call

🎉 All tests passed! Gemini is ready for production!
```

## 故障排查

### 如果 Gemini 失败

系统会自动切换到 GPT-4o-mini，不会影响用户体验。

### 检查错误日志

```bash
curl https://vita-whatsapp.vercel.app/api/debug-logs | grep gemini
```

### 常见问题

1. **API Key 无效**
   - 检查 Vercel 环境变量是否正确
   - 确认 API Key 没有多余的空格或引号

2. **速率限制**
   - Gemini 免费额度：1500次/天
   - 超过后会自动切换到 GPT-4o-mini

3. **模型不可用**
   - 确认使用 `gemini-2.0-flash`（不是 `gemini-2.0-flash-exp`）
   - 检查 Google AI Studio 中模型是否可用

## 下一步

1. ✅ 本地测试通过
2. 🔄 在 Vercel 添加环境变量
3. 🔄 重新部署
4. 🔄 运行在线测试
5. 🔄 在 WhatsApp 上测试自然语言命令

---

**当前状态**：本地测试通过，等待 Vercel 部署
