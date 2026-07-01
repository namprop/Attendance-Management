import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { deviceId } = await req.json();
    if (!deviceId) {
      return NextResponse.json({ data: null, message: "Thiếu deviceId" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Lấy thông tin Device
    const device = await db.collection("ZktecoDevices").findOne({
      _id: new ObjectId(deviceId)
    });

    if (!device || !device.connectorId) {
      return NextResponse.json({ data: null, message: "Không tìm thấy thiết bị hoặc chưa gắn cổng" }, { status: 404 });
    }

    // Lấy Connector
    const connector = await db.collection("ZktecoConnectors").findOne({
      _id: new ObjectId(device.connectorId)
    });

    if (!connector || !connector.connectorUrl) {
      return NextResponse.json({ data: null, message: "Cổng trung chuyển không hợp lệ" }, { status: 404 });
    }

    const payload = {
      action: 'cancel_enroll'
    };

    const targetUrl = new URL(connector.connectorUrl);
    if (!targetUrl.pathname.endsWith('/')) {
        targetUrl.pathname += '/';
    }

    const deviceIp = device.ipAddress || device.ip;
    if (!deviceIp) {
      return NextResponse.json({ data: null, message: "Thiết bị không có IP hợp lệ" }, { status: 400 });
    }

    const actionUrl = new URL('api/zkteco/action', targetUrl);
    actionUrl.searchParams.set('ip', deviceIp);

    // Gửi lệnh xuống connector
    const res = await fetch(actionUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-connector-id': connector._id.toString(),
        'x-target-ip': deviceIp,
        'x-api-key': process.env.HARDWARE_WEBHOOK_SECRET || 'ABC_2026_SECURE_KEY'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      return NextResponse.json({ data: null, message: "Đã gửi lệnh hủy thao tác trên máy" });
    } else {
      let friendlyMessage = data.message || "Lỗi khi gửi lệnh hủy";
      if (typeof friendlyMessage === 'string' && friendlyMessage.includes("TCP CONNECT")) {
        friendlyMessage = `Không thể kết nối đến máy chấm công (IP: ${device.ipAddress || device.ip}). Vui lòng kiểm tra lại mạng hoặc nguồn điện của máy!`;
      }
      return NextResponse.json({ data: null, message: friendlyMessage }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error("Lỗi cancel_enroll:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";

    let friendlyMessage = "Lỗi server nội bộ";
    if (errorMessage.includes("TCP CONNECT")) {
      friendlyMessage = "Không thể kết nối đến máy chấm công. Vui lòng kiểm tra lại mạng hoặc nguồn điện!";
    }

    return NextResponse.json(
      { data: null, message: friendlyMessage, error: errorMessage },
      { status: 500 }
    );
  }
}
