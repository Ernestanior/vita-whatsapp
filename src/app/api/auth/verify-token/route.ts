/**
 * API endpoint to verify login token
 * POST /api/auth/verify-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

const requestSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = requestSchema.parse(body);

    const supabase = await createClient();

    // Find token in database
    const { data: loginToken, error: tokenError } = await supabase
      .from('login_tokens')
      .select('*, users(*)')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !loginToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
        },
        { status: 401 }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(loginToken.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token has expired',
        },
        { status: 401 }
      );
    }

    // Mark token as used
    await supabase
      .from('login_tokens')
      .update({ used: true })
      .eq('token', token);

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Save session
    const { error: sessionError } = await supabase.from('sessions').insert({
      user_id: loginToken.user_id,
      token: sessionToken,
      expires_at: sessionExpiresAt.toISOString(),
    });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create session',
        },
        { status: 500 }
      );
    }

    // Return session token
    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        id: loginToken.users.id,
        phoneNumber: loginToken.users.phone_number,
        whatsappName: loginToken.users.whatsapp_name,
      },
    });
  } catch (error) {
    console.error('Error in verify-token:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
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
