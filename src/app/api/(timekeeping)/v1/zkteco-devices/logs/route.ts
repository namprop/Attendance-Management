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

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('TIMEOUT_');
}

export async function GET(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const connectorUrl = searchParams.get('connectorUrl');
    const ip = searchParams.get('ip');
    const port = searchParams.get('port');

    if (!connectorUrl || !ip) {
      return NextResponse.json({ success: false, message: 'Thiếu connectorUrl hoặc ip' }, { status: 400 });
    }

    const base = new URL(connectorUrl);
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    const url = new URL('api/zkteco/logs', base);
    url.searchParams.set('ip', ip);
    if (port) url.searchParams.set('port', port);
    ['page', 'limit'].forEach(k => {
      const v = searchParams.get(k);
      if (v) url.searchParams.set(k, v);
    });

    // 90s: kéo toàn bộ log (limit=999999) từ máy nhiều dữ liệu có thể rất chậm
    const res = await fetchWithTimeout(url.toString(), { headers: { 'x-api-key': apiKey() } }, 90_000);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ success: false, message: 'Máy chấm công phản hồi quá chậm khi kéo log (timeout 90s). Thử lại sau.' }, { status: 504 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi kết nối tới Connector' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const deviceIp = searchParams.get('ip');
    const connectorUrl = searchParams.get('connectorUrl');
    const port = searchParams.get('port');

    if (!deviceIp || !connectorUrl) {
      return NextResponse.json({ success: false, message: 'Thiếu tham số (ip, connectorUrl)' }, { status: 400 });
    }

    const targetUrl = new URL(connectorUrl);
    if (!targetUrl.pathname.endsWith('/')) targetUrl.pathname += '/';
    const actionUrl = new URL('api/zkteco/logs', targetUrl);
    actionUrl.searchParams.set('ip', deviceIp);
    if (port) actionUrl.searchParams.set('port', port);

    const res = await fetchWithTimeout(actionUrl.toString(), {
      method: 'DELETE',
      headers: { 'x-api-key': process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY' },
    }, 30_000);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ success: false, message: 'Máy chấm công không phản hồi khi xóa log (timeout 30s)' }, { status: 504 });
    }
    console.error('Lỗi proxy delete logs:', err);
    return NextResponse.json({ success: false, message: 'Lỗi kết nối tới Connector' }, { status: 500 });
  }
}
