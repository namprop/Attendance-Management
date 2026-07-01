import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { employeeId, deviceIds, existingUid } = await req.json();
    if (!employeeId || !deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return NextResponse.json({ data: null, message: "Thiếu employeeId hoặc deviceIds" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Lấy thông tin Employee
    const employee = await db.collection("employees-timekeeping").findOne({
      _id: new ObjectId(employeeId)
    });

    if (!employee) {
      return NextResponse.json({ data: null, message: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    const {
      enrollNumber,
      unaccentedName,
      devicePassword,
      devicePrivilege,
      employeeCode
    } = employee;

    const userid = employeeCode || enrollNumber;
    if (!userid) {
      return NextResponse.json({ data: null, message: "Nhân viên chưa có Mã nhân viên (hoặc Mã chấm công)" }, { status: 400 });
    }

    const roleMap: Record<string, number> = {
      "Quản trị viên": 14,
      "Nhân viên": 0
    };
    const mappedRole = roleMap[devicePrivilege as string] || 0;

    // Lấy danh sách Devices
    const deviceObjectIds = deviceIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    const devices = await db.collection("ZktecoDevices").find({
      _id: { $in: deviceObjectIds }
    }).toArray();

    if (devices.length === 0) {
      return NextResponse.json({ data: null, message: "Không tìm thấy thiết bị nào hợp lệ" }, { status: 404 });
    }

    // Lấy Connector map để gọi qua Connector
    const connectorIds = [...new Set(devices.map(d => d.connectorId?.toString()).filter(Boolean))];
    const connectors = await db.collection("ZktecoConnectors").find({
      _id: { $in: connectorIds.map(id => new ObjectId(id)) }
    }).toArray();

    const connectorMap = new Map(connectors.map(c => [c._id.toString(), c]));

    const results = [];

    // Gọi API Connector cho từng Device
    for (const device of devices) {
      try {
        const connector = connectorMap.get(device.connectorId?.toString());
        if (!connector || !connector.connectorUrl) {
          results.push({
            deviceId: device._id.toString(),
            deviceName: device.deviceName || device.name,
            success: false,
            message: "Máy chưa gắn với cổng nối (Connector) hợp lệ"
          });
          continue;
        }

        // Lấy UID đã lưu của thiết bị này (nếu có)
        const details = employee.zktecoSyncDetails?.[device._id.toString()] || {};
        const savedUid = (existingUid !== undefined && existingUid !== null) ? existingUid : (details.uid || 0);

        const payload = {
          action: 'set_user',
          uid: savedUid, // Sử dụng UID đã cấp trước đó thay vì 0 để tránh tạo thêm user rác nếu đổi mã NV
          userid: String(userid), // Mã hiển thị trên máy (thường là employeeCode: NV...)
          name: details.overrideName || unaccentedName || employee.fullName || "Unknown",
          password: details.overridePassword !== undefined ? details.overridePassword : (devicePassword || ""),
          role: details.overrideRole !== undefined ? details.overrideRole : mappedRole,
          cardno: employee.cardNo ? parseInt(employee.cardNo, 10) : 0
        };

        const targetUrl = new URL(connector.connectorUrl);
        if (!targetUrl.pathname.endsWith('/')) {
            targetUrl.pathname += '/';
        }
        const actionUrl = new URL('api/zkteco/action', targetUrl);
        actionUrl.searchParams.set('ip', device.ipAddress || device.ip);

        // Gửi header connectorId và target-ip cho connector
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
        results.push({
          deviceId: device._id.toString(),
          deviceName: device.deviceName || device.name,
          success: data.success,
          message: data.message,
          assignedUid: data.data?.assignedUid
        });

      } catch (err) {
        console.error("Lỗi đồng bộ máy:", device.deviceName || device.name, err);
        results.push({
          deviceId: device._id.toString(),
          deviceName: device.deviceName || device.name,
          success: false,
          message: "Lỗi kết nối mạng hoặc không phản hồi"
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    if (successCount > 0) {
      const successfulDeviceIds = results.filter(r => r.success).map(r => r.deviceId);
      
      const syncDetailsUpdate: Record<string, string | number> = {};
      results.filter(r => r.success).forEach(r => {
        if (r.assignedUid !== undefined) {
          syncDetailsUpdate[`zktecoSyncDetails.${r.deviceId}.uid`] = r.assignedUid;
        }
        syncDetailsUpdate[`zktecoSyncDetails.${r.deviceId}.syncedAt`] = new Date().toISOString();
      });

      await db.collection("employees-timekeeping").updateOne(
        { _id: new ObjectId(employeeId) },
        { 
          $addToSet: { zktecoLinkedDevices: { $each: successfulDeviceIds } },
          $set: syncDetailsUpdate
        }
      );
    }
    
    return NextResponse.json({
      data: results,
      message: `Đã đồng bộ xong. Thành công: ${successCount}/${devices.length} máy.`
    });

  } catch (error: unknown) {
    console.error("Lỗi sync user:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
