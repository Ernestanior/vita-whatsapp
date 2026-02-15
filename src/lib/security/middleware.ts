/**
 * 安全中间件
 * 用于 API 路由的安全检查
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkUserRateLimit, checkIpRateLimit } from './rate-limiter';
import { verifyWhatsAppWebhook, verifyStripeWebhook } from './webhook-verifier';

/**
 * 速率限制中间件
 * 用于保护 API 端点免受滥用
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  try {
    // 如果有用户 ID，使用用户级别的速率限制
    if (userId) {
      const result = await checkUserRateLimit(userId);
      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            resetAt: result.resetAt.toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.resetAt.toISOString(),
              'Retry-After': Math.ceil(
                (result.resetAt.getTime() - Date.now()) / 1000
              ).toString(),
            },
          }
        );
      }
    } else {
      // 否则使用 IP 级别的速率限制
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const result = await checkIpRateLimit(ip);
      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            message: 'Too many requests from this IP. Please try again later.',
            resetAt: result.resetAt.toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '20',
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.resetAt.toISOString(),
              'Retry-After': Math.ceil(
                (result.resetAt.getTime() - Date.now()) / 1000
              ).toString(),
            },
          }
        );
      }
    }

    return null; // 允许请求继续
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    // 发生错误时允许请求通过
    return null;
  }
}

/**
 * WhatsApp Webhook 验证中间件
 */
export async function whatsappWebhookMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const body = await request.text();

    if (!verifyWhatsAppWebhook(body, signature || undefined)) {
      return NextResponse.json(
        {
          error: 'Invalid signature',
          message: 'Webhook signature verification failed',
        },
        { status: 401 }
      );
    }

    return null; // 验证通过
  } catch (error) {
    console.error('WhatsApp webhook verification error:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: 'Failed to verify webhook signature',
      },
      { status: 500 }
    );
  }
}

/**
 * Stripe Webhook 验证中间件
 */
export async function stripeWebhookMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  try {
    const signature = request.headers.get('stripe-signature');
    const body = await request.text();

    if (!verifyStripeWebhook(body, signature || undefined)) {
      return NextResponse.json(
        {
          error: 'Invalid signature',
          message: 'Webhook signature verification failed',
        },
        { status: 401 }
      );
    }

    return null; // 验证通过
  } catch (error) {
    console.error('Stripe webhook verification error:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: 'Failed to verify webhook signature',
      },
      { status: 500 }
    );
  }
}

/**
 * CORS 中间件
 * 配置跨域资源共享
 */
export function corsMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // 允许的源
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  const origin = request.headers.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

/**
 * 安全头部中间件
 * 添加安全相关的 HTTP 头部
 */
export function securityHeadersMiddleware(response: NextResponse): NextResponse {
  // 防止点击劫持
  response.headers.set('X-Frame-Options', 'DENY');

  // 防止 MIME 类型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS 保护
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // 引用策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 内容安全策略
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  return response;
}
