import { NextRequest, NextResponse } from 'next/server';
import { webhookHandler } from '@/lib/whatsapp/webhook-handler';
import { logger } from '@/utils/logger';
import type { WebhookPayload } from '@/types/whatsapp';

/**
 * GET handler for webhook verification
 * WhatsApp will call this endpoint to verify the webhook during setup
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    logger.info({
      type: 'webhook_verification_request',
      mode,
      hasToken: !!token,
      hasChallenge: !!challenge,
    });

    if (!mode || !token || !challenge) {
      logger.warn({
        type: 'webhook_verification_missing_params',
        mode,
        hasToken: !!token,
        hasChallenge: !!challenge,
      });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = webhookHandler.verifyWebhook(mode, token, challenge);

    if (result) {
      logger.info({
        type: 'webhook_verification_success',
      });
      return new NextResponse(result, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    logger.warn({
      type: 'webhook_verification_failed',
    });
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 403 }
    );
  } catch (error) {
    logger.error({
      type: 'webhook_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for incoming webhook events
 * WhatsApp will send messages and status updates to this endpoint
 * Updated: Now includes signature verification for security
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Add to debug logs
    const { addLog } = await import('@/app/api/debug-logs/route');
    addLog({
      type: 'webhook_received',
      hasSignature: !!signature,
      bodyLength: rawBody.length,
      body: rawBody,
      headers: Object.fromEntries(request.headers.entries()),
    });

    logger.info({
      type: 'webhook_received',
      hasSignature: !!signature,
      bodyLength: rawBody.length,
      headers: Object.fromEntries(request.headers.entries()),
      body: rawBody.substring(0, 500), // Log first 500 chars
    });

    // Parse payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
      
      // Add to debug logs
      addLog({
        type: 'webhook_payload_parsed',
        object: payload.object,
        entryCount: payload.entry?.length || 0,
        payload: payload,
      });
    } catch (error) {
      addLog({
        type: 'webhook_invalid_json',
        error: error instanceof Error ? error.message : 'Unknown error',
        rawBody: rawBody.substring(0, 200),
      });
      
      logger.error({
        type: 'webhook_invalid_json',
        error: error instanceof Error ? error.message : 'Unknown error',
        rawBody: rawBody.substring(0, 200),
      });
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    logger.info({
      type: 'webhook_payload_parsed',
      object: payload.object,
      entryCount: payload.entry?.length || 0,
      payload: JSON.stringify(payload).substring(0, 500),
    });

    // Process webhook with signature verification
    // We respond immediately to WhatsApp and process in the background
    webhookHandler.handleWebhook(payload, rawBody, signature).catch(error => {
      logger.error({
        type: 'webhook_async_processing_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    });

    // Return 200 OK immediately to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({
      type: 'webhook_post_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check if it's a signature verification error
    if (error instanceof Error && error.message === 'Invalid webhook signature') {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Still return 200 for other errors to prevent WhatsApp from retrying
    // Log the error for investigation
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
