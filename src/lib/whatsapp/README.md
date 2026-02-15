# WhatsApp Webhook Handler

This module implements the WhatsApp Cloud API webhook integration for Vita AI.

## Components

### 1. WhatsApp Client (`client.ts`)

Handles all interactions with the WhatsApp Cloud API:

- **Media Download**: Downloads images and other media files from WhatsApp
- **Send Messages**: Sends text messages and interactive button messages
- **Message Status**: Marks messages as read
- **Typing Indicator**: Placeholder for typing status (not supported by Cloud API)

#### Usage Example

```typescript
import { whatsappClient } from '@/lib/whatsapp';

// Send a text message
await whatsappClient.sendTextMessage('+6512345678', 'Hello!');

// Send a message with buttons
await whatsappClient.sendButtonMessage(
  '+6512345678',
  'Choose an option:',
  [
    { id: 'option1', title: 'Option 1' },
    { id: 'option2', title: 'Option 2' },
  ]
);

// Download media
const imageBuffer = await whatsappClient.downloadMedia('media-id');
```

### 2. Webhook Handler (`webhook-handler.ts`)

Processes incoming webhook events from WhatsApp:

- **Webhook Verification**: Handles the initial webhook setup verification
- **Message Routing**: Routes messages based on type (text, image, interactive)
- **Acknowledgment**: Sends quick responses within 3 seconds
- **Error Handling**: Gracefully handles errors and continues processing

#### Message Flow

1. WhatsApp sends webhook event
2. Handler validates payload
3. Message is marked as read
4. Quick acknowledgment is sent (< 3 seconds)
5. Message is routed to appropriate handler
6. Full response is sent

#### Supported Message Types

- ✅ **Text**: Text messages from users
- ✅ **Image**: Food photos for recognition
- ✅ **Interactive**: Button and list replies
- ⚠️ **Audio/Video/Document**: Currently unsupported (sends friendly error)

### 3. API Route (`/api/webhook`)

Next.js API route that exposes the webhook endpoint:

- **GET**: Webhook verification during setup
- **POST**: Receives incoming messages and events

#### Webhook Setup

1. Configure webhook URL in Meta Developer Console:
   ```
   https://your-domain.com/api/webhook
   ```

2. Set verify token in environment variables:
   ```
   WHATSAPP_VERIFY_TOKEN=your-secret-token
   ```

3. WhatsApp will call GET endpoint to verify
4. Once verified, POST endpoint receives messages

## Environment Variables

Required environment variables (see `.env.example`):

```env
WHATSAPP_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

## Error Handling

The webhook handler implements robust error handling:

- **Validation Errors**: Invalid payloads are logged and ignored
- **Processing Errors**: Individual message failures don't stop other messages
- **API Errors**: WhatsApp API errors are logged and retried where appropriate
- **Async Processing**: Webhook responds immediately (200 OK) and processes asynchronously

## Logging

All webhook events are logged with structured logging:

- `webhook_verification_request`: Verification attempts
- `webhook_received`: Incoming webhook events
- `message_received`: Individual messages
- `image_downloaded`: Media download success
- `webhook_processing_error`: Processing errors

## Next Steps

The following handlers need to be implemented:

1. **Text Handler**: Process text commands and natural language
2. **Image Handler**: Food recognition and nutrition analysis
3. **Interactive Handler**: Handle button/list replies
4. **Message Router**: Route messages to appropriate handlers based on context

## Testing

Unit tests are located in `__tests__/webhook-handler.test.ts`.

To run tests (once vitest is configured):
```bash
npm test
```

## Security

- Webhook verification token prevents unauthorized access
- All API calls use Bearer token authentication
- Sensitive data is not logged (phone numbers are truncated)
- Errors return 200 OK to prevent retry storms

## References

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
- [Message Types](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
