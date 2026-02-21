import { NextRequest, NextResponse } from 'next/server';

/**
 * VAPI webhook handler for FloodNet.
 * VAPI is used purely as a transcriber — the AI intelligence comes from n8n.
 * This webhook handles call lifecycle events for logging.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageType = body.message?.type;

    console.log('[VAPI Webhook] Event:', messageType);

    if (messageType === 'assistant-request') {
      console.log('[VAPI Webhook] Assistant request received');
      return NextResponse.json({ ok: true });
    }

    if (messageType === 'end-of-call-report') {
      const callId = body.message?.call?.id;
      const duration = body.message?.durationSeconds;
      console.log(`[VAPI Webhook] Call ended: ${callId}, duration: ${duration}s`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[VAPI Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
