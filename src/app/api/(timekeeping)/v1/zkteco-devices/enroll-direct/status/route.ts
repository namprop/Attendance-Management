export const dynamic = 'force-dynamic';

const apiKey = () => process.env.HARDWARE_WEBHOOK_SECRET || 'ABC_2026_SECURE_KEY';

// GET SSE: proxy stream trạng thái enroll vân tay từ connector về browser
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectorUrl = searchParams.get('connectorUrl');
  const ip = searchParams.get('ip');
  const port = searchParams.get('port');
  const userId = searchParams.get('userId');

  if (!connectorUrl || !ip || !userId) {
    return new Response('data: {"error":"Thiếu tham số"}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  try {
    const base = new URL(connectorUrl);
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    const url = new URL('api/zkteco/enroll/status', base);
    url.searchParams.set('ip', ip);
    if (port) url.searchParams.set('port', port);
    url.searchParams.set('userId', userId);

    const connectorRes = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey() },
      signal: req.signal,
    });

    // Proxy body stream thẳng về client
    return new Response(connectorRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return new Response('data: {"status":"error"}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
}
