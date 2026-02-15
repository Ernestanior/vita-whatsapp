/**
 * Webhook 签名验证
 * 用于验证 WhatsApp 和 Stripe Webhook 的真实性
 */

import crypto from 'crypto';
import { env } from '@/config/env';

/**
 * 验证 WhatsApp Webhook 签名
 * WhatsApp 使用 SHA256 HMAC 签名
 */
export function verifyWhatsAppWebhook(
  payload: string | Buffer,
  signature: string | undefined
): boolean {
  if (!signature) {
    console.error('WhatsApp webhook signature missing');
    return false;
  }

  try {
    // WhatsApp 签名格式: sha256=<signature>
    const signatureParts = signature.split('=');
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
      console.error('Invalid WhatsApp signature format');
      return false;
    }

    const receivedSignature = signatureParts[1];

    // 计算期望的签名
    const expectedSignature = crypto
      .createHmac('sha256', env.WHATSAPP_VERIFY_TOKEN)
      .update(payload)
      .digest('hex');

    // 使用时间安全的比较
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('WhatsApp webhook verification failed:', error);
    return false;
  }
}

/**
 * 验证 Stripe Webhook 签名
 * Stripe 使用自己的签名验证机制
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string | undefined
): boolean {
  if (!signature) {
    console.error('Stripe webhook signature missing');
    return false;
  }

  try {
    // Stripe 签名格式: t=<timestamp>,v1=<signature>
    const signatureParts = signature.split(',');
    const timestampPart = signatureParts.find((part) => part.startsWith('t='));
    const signaturePart = signatureParts.find((part) => part.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      console.error('Invalid Stripe signature format');
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const receivedSignature = signaturePart.split('=')[1];

    // 检查时间戳是否在合理范围内（5 分钟）
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - webhookTime) > 300) {
      console.error('Stripe webhook timestamp too old');
      return false;
    }

    // 计算期望的签名
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    // 使用时间安全的比较
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Stripe webhook verification failed:', error);
    return false;
  }
}

/**
 * 验证 WhatsApp Webhook 验证请求（GET 请求）
 * 用于 WhatsApp 初始设置时的验证
 */
export function verifyWhatsAppChallenge(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined
): string | null {
  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    return challenge || null;
  }
  return null;
}

/**
 * 生成 Webhook 签名（用于测试）
 */
export function generateWebhookSignature(
  payload: string | Buffer,
  secret: string,
  algorithm: 'sha256' = 'sha256'
): string {
  return crypto.createHmac(algorithm, secret).update(payload).digest('hex');
}
