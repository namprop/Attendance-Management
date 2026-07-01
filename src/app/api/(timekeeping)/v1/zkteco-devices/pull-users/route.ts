import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId || !ObjectId.isValid(deviceId)) {
      return NextResponse.json({ success: false, data: [], message: "Thiếu hoặc sai định dạng deviceId" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Lấy thông tin thiết bị
    const device = await db.collection("ZktecoDevices").findOne({
      _id: new ObjectId(deviceId)
    });

    if (!device) {
      return NextResponse.json({ success: false, data: [], message: "Không tìm thấy thiết bị" }, { status: 404 });
    }

    // Lấy thông tin Connector của thiết bị
    if (!device.connectorId) {
      return NextResponse.json({ success: false, data: [], message: "Thiết bị chưa được cấu hình Connector" }, { status: 400 });
    }

    const connector = await db.collection("ZktecoConnectors").findOne({
      _id: new ObjectId(device.connectorId)
    });

    if (!connector || !connector.connectorUrl) {
      return NextResponse.json({ success: false, data: [], message: "Không tìm thấy Cổng nối (Connector) hợp lệ" }, { status: 404 });
    }

    // Build URL gọi sang Connector
    const targetUrl = new URL(connector.connectorUrl);
    if (!targetUrl.pathname.endsWith('/')) {
        targetUrl.pathname += '/';
    }
    const actionUrl = new URL('api/zkteco/action', targetUrl);
    actionUrl.searchParams.set('ip', device.ipAddress || device.ip);

    // Gửi yêu cầu lấy danh sách user từ máy chấm công
    const res = await fetch(actionUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-connector-id': connector._id.toString(),
        'x-target-ip': device.ipAddress || device.ip,
        'x-api-key': process.env.HARDWARE_WEBHOOK_SECRET || 'ABC_2026_SECURE_KEY'
      },
      body: JSON.stringify({ action: 'get_users' })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        data: [],
        message: errData.message || `Lỗi từ Connector: HTTP ${res.status}`
      }, { status: res.status });
    }

    const result = await res.json();
    let machineUsers = result.data || [];

    // Lấy danh sách nhân viên đã được liên kết với máy này
    try {
      const linkedEmployees = await db.collection("employees-timekeeping").find({
        [`zktecoSyncDetails.${deviceId}`]: { $exists: true }
      }).toArray();

      const linkedUidsMap: Record<string, { employeeId: string; employeeCode: string; employeeName: string }> = {};
      linkedEmployees.forEach(emp => {
        const details = emp.zktecoSyncDetails?.[deviceId];
        if (details && details.uid !== undefined) {
          linkedUidsMap[String(details.uid)] = {
            employeeId: emp._id.toString(),
            employeeCode: emp.employeeCode || emp.code || emp.enrollNumber,
            employeeName: emp.fullName || emp.name
          };
        }
      });

      console.log('--- DEBUG pull-users ---');
      console.log('deviceId:', deviceId);
      console.log('linkedEmployees found:', linkedEmployees.length);
      console.log('linkedUidsMap:', linkedUidsMap);

      machineUsers = machineUsers.map((u: { uid: number; [key: string]: unknown }) => ({
        ...u,
        linkedEmployee: linkedUidsMap[String(u.uid)] || null
      }));
    } catch (dbErr) {
      console.error("Lỗi khi map linked employees:", dbErr);
    }

    return NextResponse.json({
      success: result.success,
      data: machineUsers,
      message: result.message || "Tải dữ liệu nhân viên từ máy chấm công thành công"
    });

  } catch (error: unknown) {
    console.error("Lỗi lấy danh sách user từ máy chấm công:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { success: false, data: [], message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
