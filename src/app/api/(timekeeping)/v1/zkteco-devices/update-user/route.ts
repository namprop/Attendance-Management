import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { employeeId, deviceId, name, password, role } = await req.json();
    
    if (!employeeId || !deviceId || !name) {
      return NextResponse.json({ data: null, message: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // 1. Lấy thông tin Employee
    const employee = await db.collection("employees-timekeeping").findOne({
      _id: new ObjectId(employeeId)
    });

    if (!employee) {
      return NextResponse.json({ data: null, message: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    // 2. Lấy thông tin Device và Connector
    const device = await db.collection("ZktecoDevices").findOne({
      _id: new ObjectId(deviceId)
    });

    if (!device) {
      return NextResponse.json({ data: null, message: "Không tìm thấy thiết bị" }, { status: 404 });
    }

    if (!device.connectorId) {
      return NextResponse.json({ data: null, message: "Máy chưa gắn với cổng nối (Connector)" }, { status: 400 });
    }

    const connector = await db.collection("ZktecoConnectors").findOne({
      _id: new ObjectId(device.connectorId)
    });

    if (!connector || !connector.connectorUrl) {
      return NextResponse.json({ data: null, message: "Cổng nối không hợp lệ" }, { status: 400 });
    }

    // 3. Chuẩn bị Payload
    const userid = employee.employeeCode || employee.enrollNumber;
    if (!userid) {
      return NextResponse.json({ data: null, message: "Nhân viên chưa có Mã nhân viên" }, { status: 400 });
    }

    // Lấy UID đã lưu
    const savedUid = employee.zktecoSyncDetails?.[deviceId]?.uid || 0;
    
    if (!savedUid) {
      return NextResponse.json({ data: null, message: "Nhân viên chưa được cấp UID trên máy này. Vui lòng đồng bộ trước." }, { status: 400 });
    }

    const payload = {
      action: 'set_user',
      uid: savedUid,
      userid: String(userid),
      name: name,
      password: password || "",
      role: Number(role) || 0,
      cardno: employee.cardNo ? parseInt(employee.cardNo, 10) : 0
    };

    const targetUrl = new URL(connector.connectorUrl);
    if (!targetUrl.pathname.endsWith('/')) {
        targetUrl.pathname += '/';
    }
    const actionUrl = new URL('api/zkteco/action', targetUrl);
    actionUrl.searchParams.set('ip', device.ipAddress || device.ip);

    // 4. Gọi API Connector
    const res = await fetch(actionUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-connector-id': connector._id.toString(),
        'x-target-ip': device.ipAddress || device.ip,
        'x-api-key': process.env.HARDWARE_WEBHOOK_SECRET || 'ABC_2026_SECURE_KEY'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (!data.success) {
      return NextResponse.json({ data: null, message: data.message || "Lỗi cập nhật xuống máy" }, { status: 400 });
    }

    // 5. Cập nhật vào DB (ghi đè overrides)
    const updatePath = `zktecoSyncDetails.${deviceId}`;
    await db.collection("employees-timekeeping").updateOne(
      { _id: new ObjectId(employeeId) },
      { 
        $set: { 
          [`${updatePath}.overrideName`]: name,
          [`${updatePath}.overridePassword`]: password || "",
          [`${updatePath}.overrideRole`]: Number(role) || 0,
          [`${updatePath}.updatedAt`]: new Date().toISOString()
        }
      }
    );

    return NextResponse.json({
      data: null,
      message: "Cập nhật thông tin trên máy thành công!"
    });

  } catch (error: unknown) {
    console.error("Lỗi cập nhật user máy ZKTeco:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
