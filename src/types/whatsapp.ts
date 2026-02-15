// WhatsApp Cloud API Webhook Types

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Contact[];
  messages?: Message[];
  statuses?: Status[];
}

export interface Contact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface Message {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'interactive' | 'audio' | 'video' | 'document';
  text?: TextMessage;
  image?: MediaMessage;
  interactive?: InteractiveMessage;
  audio?: MediaMessage;
  video?: MediaMessage;
  document?: MediaMessage;
}

export interface TextMessage {
  body: string;
}

export interface MediaMessage {
  id: string;
  mime_type: string;
  sha256: string;
  caption?: string;
}

export interface InteractiveMessage {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface Status {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: StatusError[];
}

export interface StatusError {
  code: number;
  title: string;
  message: string;
  error_data?: {
    details: string;
  };
}

// WhatsApp API Response Types
export interface MediaUrlResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: string;
}

export interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

// Message Context
export interface MessageContext {
  userId: string;
  messageId: string;
  timestamp: Date;
  language: 'en' | 'zh-CN' | 'zh-TW';
  userName?: string;
}
