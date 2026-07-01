import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';

const apiKey = () => process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`TIMEOUT_${timeoutMs}`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

// POST: start hoặc cancel enroll vân tay trực tiếp
export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const body = await req.json();
    const { connectorUrl, ip, port, ...payload } = body;

    if (!connectorUrl || !ip) {
      return NextResponse.json({ success: false, message: 'Thiếu connectorUrl hoặc ip' }, { status: 400 });
    }

    const base = new URL(connectorUrl);
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    const url = new URL('api/zkteco/enroll', base);
    url.searchParams.set('ip', ip);
    if (port) url.searchParams.set('port', String(port));

    const res = await fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey() },
      body: JSON.stringify(payload),
    }, 15_000);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('TIMEOUT_')) {
      return NextResponse.json({ success: false, message: 'Máy chấm công không phản hồi lệnh đăng ký vân tay (timeout 15s)' }, { status: 504 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi kết nối tới Connector' }, { status: 500 });
  }
}
