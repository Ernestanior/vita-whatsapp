/**
 * API endpoint to send login link via WhatsApp
 * POST /api/auth/send-login-link
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { whatsappClient } from '@/lib/whatsapp/client';
import crypto from 'crypto';
import { z } from 'zod';

const requestSchema = z.object({
  phone: z.string().min(8).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = requestSchema.parse(body);

    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/[\s-]/g, '');

    // Check if user exists
    const supabase = await createClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone_number')
      .eq('phone_number', normalizedPhone)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found. Please use Vita AI via WhatsApp first.',
        },
        { status: 404 }
      );
    }

    // Generate one-time login token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to database
    const { error: tokenError } = await supabase.from('login_tokens').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (tokenError) {
      console.error('Error saving login token:', tokenError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate login link',
        },
        { status: 500 }
      );
    }

    // Generate login URL
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/auth/verify?token=${token}`;

    // Send login link via WhatsApp
    try {
      await whatsappClient.sendMessage(normalizedPhone, {
        text: `🔐 点击链接登录 Vita AI Dashboard:\n\n${loginUrl}\n\n链接 15 分钟内有效。\n\n如果您没有请求此链接，请忽略此消息。`,
      });
    } catch (whatsappError) {
      console.error('Error sending WhatsApp message:', whatsappError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send login link via WhatsApp',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Login link sent to your WhatsApp',
    });
  } catch (error) {
    console.error('Error in send-login-link:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid phone number format',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
