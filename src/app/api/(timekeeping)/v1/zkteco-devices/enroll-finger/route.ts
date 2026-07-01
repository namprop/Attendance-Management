import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { employeeId, deviceId, fingerIndex = 0 } = await req.json();
    if (!employeeId || !deviceId) {
      return NextResponse.json({ data: null, message: "Thiếu employeeId hoặc deviceId" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Lấy thông tin Employee
    const employee = await db.collection("employees-timekeeping").findOne({
      _id: new ObjectId(employeeId)
    });

    if (!employee) {
      return NextResponse.json({ data: null, message: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    const userid = employee.employeeCode || employee.enrollNumber;
    if (!userid) {
      return NextResponse.json({ data: null, message: "Nhân viên chưa có Mã nhân viên (hoặc Mã chấm công)" }, { status: 400 });
    }

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
      action: 'enroll_finger',
      userid: String(userid),
      name: employee.fullName || 'No Name',
      fingerIndex: fingerIndex // Lấy từ request thay vì 0
    };

    const targetUrl = new URL(connector.connectorUrl);
    if (!targetUrl.pathname.endsWith('/')) {
        targetUrl.pathname += '/';
    }
    const actionUrl = new URL('api/zkteco/action', targetUrl);
    actionUrl.searchParams.set('ip', device.ipAddress || device.ip);

    // Gửi lệnh xuống connector
    const res = await fetch(actionUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-connector-id': connector._id.toString(),
        'x-target-ip': device.ipAddress || device.ip,
        'x-api-key': process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      return NextResponse.json({ data: null, message: "Đã gửi lệnh kích hoạt máy quét vân tay. Vui lòng thao tác trên máy!" });
    } else {
      let friendlyMessage = data.message || "Lỗi khi gửi lệnh";
      if (typeof friendlyMessage === 'string' && friendlyMessage.includes("TCP CONNECT")) {
        friendlyMessage = `Không thể kết nối đến máy chấm công (IP: ${device.ipAddress || device.ip}). Vui lòng kiểm tra lại mạng hoặc nguồn điện của máy!`;
      }
      return NextResponse.json({ data: null, message: friendlyMessage }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error("Lỗi enroll_finger:", error);
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
