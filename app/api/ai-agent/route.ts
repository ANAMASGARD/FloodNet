import { NextRequest, NextResponse } from 'next/server';

/**
 * ALL conversation data (voice transcripts + text chat) is forwarded
 * to the n8n AI Agent via webhook. No local AI processing.
 *
 * Flow:
 *   1. User speaks (VAPI transcribes) or types
 *   2. Frontend collects full conversation → POST /api/ai-agent
 *   3. This route forwards everything to N8N_WEBHOOK_URL
 *   4. n8n AI agent processes, returns structured response
 *   5. Frontend renders response + map markers
 *
 * n8n webhook expected request:
 *   { messages: [{role, content}], isFinal: boolean, source: string, timestamp: string }
 *
 * n8n webhook expected response (conversation):
 *   { resp: "string", ui: "location|severity|emergencyType|final|none" }
 *
 * n8n webhook expected response (final plan):
 *   { flood_response: { location, severity, summary, flood_zones[], safe_zones[], ... } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, isFinal = false, isFollowUp = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 });
    }

    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

    if (!N8N_WEBHOOK_URL) {
      return NextResponse.json({
        resp: 'N8N_WEBHOOK_URL is not configured. Please set it in .env to connect the AI agent.',
        ui: 'none',
      });
    }

    const validatedMessages = validateMessages(messages);

    console.log('[AI Agent] → n8n:', {
      count: validatedMessages.length,
      isFinal,
      isFollowUp,
    });

    const n8nPayload = {
      messages: validatedMessages,
      isFinal,
      isFollowUp,
      source: 'floodnet-command-center',
      timestamp: new Date().toISOString(),
    };

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text().catch(() => 'Unknown error');
      console.error('[AI Agent] n8n error:', n8nResponse.status, errorText);
      return NextResponse.json({
        resp: `n8n agent returned an error (${n8nResponse.status}). Please check your n8n workflow.`,
        ui: 'none',
      });
    }

    const data = await n8nResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[AI Agent] Error:', error?.message || error);
    return NextResponse.json(
      { resp: 'Failed to reach the AI agent. Check the webhook URL and n8n workflow.', ui: 'none' },
      { status: 500 },
    );
  }
}

function validateMessages(messages: any[]) {
  const result: { role: string; content: string }[] = [];
  let lastRole: string | null = null;

  for (const msg of messages) {
    if (msg.role === lastRole) continue;
    if (!msg.content || String(msg.content).trim() === '') continue;
    if (msg.role === 'user' || msg.role === 'assistant') {
      result.push({ role: msg.role, content: String(msg.content) });
      lastRole = msg.role;
    }
  }

  while (result.length > 0 && result[0].role === 'assistant') result.shift();
  if (result.length === 0) result.push({ role: 'user', content: 'I need help with flood response.' });
  if (result[result.length - 1].role !== 'user') {
    result.push({ role: 'user', content: 'Continue helping me.' });
  }

  return result;
}
