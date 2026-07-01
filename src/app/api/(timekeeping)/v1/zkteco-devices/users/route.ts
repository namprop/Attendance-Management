import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';

const apiKey = () => process.env.HARDWARE_WEBHOOK_SECRET || 'ABC_2026_SECURE_KEY';

function buildUrl(connectorUrl: string, path: string, ip: string, port?: string | null) {
  const base = new URL(connectorUrl);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const url = new URL(path, base);
  url.searchParams.set('ip', ip);
  if (port) url.searchParams.set('port', port);
  return url;
}

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

    const url = buildUrl(connectorUrl, 'api/zkteco/users', ip, port);
    ['page', 'limit', 'search'].forEach(k => {
      const v = searchParams.get(k);
      if (v) url.searchParams.set(k, v);
    });

    const res = await fetchWithTimeout(url.toString(), { headers: { 'x-api-key': apiKey() } }, 30_000);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ success: false, message: 'Máy chấm công phản hồi quá chậm (timeout 30s)' }, { status: 504 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi kết nối tới Connector' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const body = await req.json();
    const { connectorUrl, ip, port, ...payload } = body;

    if (!connectorUrl || !ip) {
      return NextResponse.json({ success: false, message: 'Thiếu connectorUrl hoặc ip' }, { status: 400 });
    }

    const url = buildUrl(connectorUrl, 'api/zkteco/users', ip, port);
    const res = await fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey() },
      body: JSON.stringify(payload),
    }, 15_000);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ success: false, message: 'Máy chấm công không phản hồi khi tạo user (timeout 15s)' }, { status: 504 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi kết nối tới Connector' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const body = await req.json();
    const { connectorUrl, ip, port, uid, ...payload } = body;

    if (!connectorUrl || !ip || uid === undefined) {
      return NextResponse.json({ success: false, message: 'Thiếu connectorUrl, ip hoặc uid' }, { status: 400 });
    }

    const url = buildUrl(connectorUrl, `api/zkteco/users/${uid}`, ip, port);
    const res = await fetchWithTimeout(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey() },
      body: JSON.stringify(payload),
    }, 15_000);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ success: false, message: 'Máy chấm công không phản hồi khi cập nhật user (timeout 15s)' }, { status: 504 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi kết nối tới Connector' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const connectorUrl = searchParams.get('connectorUrl');
    const ip = searchParams.get('ip');
    const port = searchParams.get('port');
    const uid = searchParams.get('uid');

    if (!connectorUrl || !ip || !uid) {
      return NextResponse.json({ success: false, message: 'Thiếu connectorUrl, ip hoặc uid' }, { status: 400 });
    }

    const url = buildUrl(connectorUrl, `api/zkteco/users/${uid}`, ip, port);
    const res = await fetchWithTimeout(url.toString(), {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey() },
    }, 15_000);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ success: false, message: 'Máy chấm công không phản hồi khi xóa user (timeout 15s)' }, { status: 504 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi kết nối tới Connector' }, { status: 500 });
  }
}
