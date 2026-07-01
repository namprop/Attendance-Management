import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
    const permError = await requirePermission(req, 'timekeeping_devices');
    if (permError) return permError;

    try {
        const body = await req.json();
        const { action, deviceIp, devicePort, connectorUrl, password } = body;

        if (!action || !deviceIp || !connectorUrl) {
            return NextResponse.json({ success: false, message: "Thiếu tham số bắt buộc (action, deviceIp, connectorUrl)" }, { status: 400 });
        }

        const targetUrl = new URL(connectorUrl);
        if (!targetUrl.pathname.endsWith('/')) targetUrl.pathname += '/';
        const actionUrl = new URL('api/zkteco/action', targetUrl);
        actionUrl.searchParams.set('ip', deviceIp);
        if (devicePort) {
            actionUrl.searchParams.set('port', String(devicePort));
        }

        const res = await fetch(actionUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY'
            },
            body: JSON.stringify({ action, password })
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: unknown) {
        console.error("Lỗi proxy gửi lệnh thiết bị:", error);
        return NextResponse.json({ success: false, message: "Lỗi mất kết nối mạng tới Connector nội bộ" }, { status: 500 });
    }
}
