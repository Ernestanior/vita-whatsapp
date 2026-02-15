# Message Routing System

This document describes the message routing and text handling implementation for Vita AI.

## Overview

The message routing system consists of two main components:

1. **MessageRouter** - Routes incoming messages to appropriate handlers based on message type
2. **TextHandler** - Processes text messages and commands

## Architecture

```
WhatsApp Message
       ↓
WebhookHandler
       ↓
MessageRouter
       ↓
   ┌────┴────┬─────────┬──────────┐
   ↓         ↓         ↓          ↓
TextHandler ImageHandler InteractiveHandler UnsupportedHandler
```

## MessageRouter

### Responsibilities

- Identify message type (text/image/interactive)
- Detect user language preference
- Route messages to appropriate handlers

### Language Detection

The router automatically detects the user's language using the following strategy:

1. Check user profile in database (TODO)
2. Analyze message content for language patterns
3. Default to English

**Detection Algorithm:**
- If message contains >30% Chinese characters (U+4E00 to U+9FFF), classify as Chinese
- Otherwise, classify as English
- Future: Distinguish between Simplified and Traditional Chinese

### Usage

```typescript
import { messageRouter } from '@/lib/whatsapp';

const context: MessageContext = {
  userId: message.from,
  messageId: message.id,
  timestamp: new Date(),
  language: 'en', // Will be auto-detected
};

await messageRouter.route(message, context);
```

## TextHandler

### Responsibilities

- Recognize commands (/start, /profile, /help, /stats, /settings)
- Handle natural language for profile updates
- Support both English and Chinese commands

### Supported Commands

| Command | English | 简体中文 | 繁體中文 | Description |
|---------|---------|---------|---------|-------------|
| Start | `/start` | `开始` | `開始` | Welcome and onboarding |
| Profile | `/profile` | `画像`, `个人资料` | `畫像`, `個人資料` | View/update health profile |
| Help | `/help` | `帮助` | `幫助` | Show available commands |
| Stats | `/stats` | `统计` | `統計` | View nutrition statistics |
| Settings | `/settings` | `设置` | `設置` | Adjust preferences |

### Command Recognition

Commands are recognized in multiple ways:

1. **Slash commands**: `/start`, `/help`, etc.
2. **Chinese keywords**: `帮助`, `统计`, etc.
3. **Case-insensitive**: `/HELP` = `/help`

### Multi-language Support

All responses are available in three languages:

- **English** (`en`)
- **Simplified Chinese** (`zh-CN`)
- **Traditional Chinese** (`zh-TW`)

The handler automatically uses the language specified in the `MessageContext`.

### Natural Language Processing

The handler can process natural language input for profile updates (TODO):

- "I'm now 65kg" → Update weight to 65kg
- "My height is 170cm" → Update height to 170cm
- "我现在 65kg" → Update weight to 65kg

Currently, natural language understanding is not fully implemented and will respond with a helpful message directing users to use commands.

## Integration with WebhookHandler

The `WebhookHandler` has been updated to use the `MessageRouter`:

```typescript
// Old approach (removed)
switch (message.type) {
  case 'text':
    await this.handleTextMessage(message, context);
    break;
  // ...
}

// New approach
await messageRouter.route(message, context);
```

This simplifies the webhook handler and makes the routing logic reusable.

## Error Handling

Both components implement comprehensive error handling:

1. **Logging**: All errors are logged with context
2. **User feedback**: Users receive friendly error messages in their language
3. **Graceful degradation**: Errors don't crash the entire system

### Error Message Examples

**English:**
```
❌ Sorry, something went wrong. Please try again or type /help for assistance.
```

**简体中文:**
```
❌ 抱歉，出错了。请重试或输入 /help 获取帮助。
```

## Testing

### Manual Testing

Run the manual test script:

```bash
npx tsx scripts/test-message-router.ts
```

This will test:
- Message routing for different types
- Language detection
- Command recognition
- Multi-language responses

### Unit Tests

Unit tests are available in:
- `src/lib/whatsapp/__tests__/message-router.test.ts`
- `src/lib/whatsapp/__tests__/text-handler.test.ts`

Run tests with:
```bash
npm test
```

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic command recognition
- ✅ Multi-language support
- ✅ Language detection
- ✅ Error handling

### Phase 2 (Next)
- [ ] Natural language understanding for profile updates
- [ ] Integration with ProfileManager
- [ ] User profile persistence
- [ ] Distinguish Traditional vs Simplified Chinese

### Phase 3 (Future)
- [ ] Context-aware responses
- [ ] Conversation state management
- [ ] Advanced NLU with AI
- [ ] Voice message support

## Requirements Validation

This implementation satisfies the following requirements:

### Requirement 5.2: WhatsApp Bot 交互
✅ Recognizes and responds to commands (/start, /profile, /help, /stats, /settings)

### Requirement 5.7: 多语言支持
✅ Supports Chinese and English dual-language interaction
✅ Automatically identifies user language

### Requirement 15.2: 语言检测
✅ Automatically detects user language preference
✅ Allows users to switch interface language

### Requirement 4.5: 自然语言更新
⏳ Framework in place for natural language profile updates (implementation pending)

## API Reference

### MessageRouter

```typescript
class MessageRouter {
  /**
   * Route message to appropriate handler
   */
  async route(message: Message, context: MessageContext): Promise<void>

  /**
   * Get message type for logging/analytics
   */
  getMessageType(message: Message): string
}
```

### TextHandler

```typescript
class TextHandler {
  /**
   * Handle incoming text message
   */
  async handle(message: Message, context: MessageContext): Promise<void>
}

enum Command {
  START = 'start',
  PROFILE = 'profile',
  HELP = 'help',
  STATS = 'stats',
  SETTINGS = 'settings',
  UNKNOWN = 'unknown',
}
```

## Examples

### Example 1: User sends /start command

```typescript
// Input
const message = {
  from: '1234567890',
  type: 'text',
  text: { body: '/start' }
};

// Output (English)
"👋 Welcome to Vita AI!
I'm your personal health and nutrition assistant...
Please tell me your height (in cm):"
```

### Example 2: User sends Chinese help command

```typescript
// Input
const message = {
  from: '1234567890',
  type: 'text',
  text: { body: '帮助' }
};

const context = {
  language: 'zh-CN'
};

// Output (Simplified Chinese)
"🤖 Vita AI 帮助
*可用命令：*
/start - 开始使用并设置画像
..."
```

### Example 3: Language auto-detection

```typescript
// Input
const message = {
  from: '1234567890',
  type: 'text',
  text: { body: '你好，我想查看我的健康画像' }
};

// Language detection
// Chinese characters: 11 out of 15 total = 73%
// Result: language = 'zh-CN'
```

## Troubleshooting

### Issue: Commands not recognized

**Solution:** Ensure the command is in the supported list and properly formatted. Commands are case-insensitive but must match exactly.

### Issue: Wrong language detected

**Solution:** Language detection is based on character analysis. For mixed-language text, the system uses a 30% threshold. Users can explicitly set their language preference in settings (coming soon).

### Issue: Error messages not showing

**Solution:** Check that the WhatsApp client is properly configured and the user's phone number is valid.

## Contributing

When adding new commands:

1. Add the command to the `Command` enum
2. Add command mappings in `recognizeCommand()` for all languages
3. Implement the handler method (e.g., `handleNewCommand()`)
4. Add response messages for all three languages
5. Update this documentation
6. Add tests

## Related Documentation

- [WhatsApp Integration](./README.md)
- [Webhook Handler](./webhook-handler.ts)
- [Type Definitions](../../types/whatsapp.ts)
