import { NextResponse } from 'next/server';

export async function GET() {
  const ZYND_KEY = process.env.ZYND_API_KEY;

  if (!ZYND_KEY) {
    return NextResponse.json({ agents: [], error: 'ZYND_API_KEY not configured' });
  }

  try {
    const r = await fetch(
      `https://registry.zynd.ai/agents/search?q=floodnet+flood&limit=10`,
      {
        headers: { Authorization: `Bearer ${ZYND_KEY}` },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!r.ok) {
      return NextResponse.json({ agents: [], error: `Registry returned ${r.status}` });
    }

    const data = await r.json();
    const agents = (data.agents || data.results || []).map((a: any) => ({
      name: a.name,
      description: a.description,
      endpoint: a.endpoint || a.httpWebhookUrl,
      capabilities: a.capabilities,
      price: a.price || '$0',
    }));

    return NextResponse.json({ agents, count: agents.length });
  } catch (e: any) {
    return NextResponse.json({ agents: [], error: e.message });
  }
}
