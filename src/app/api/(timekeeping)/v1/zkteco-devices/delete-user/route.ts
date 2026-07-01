import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { employeeId, deviceIds } = await req.json();
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

    interface ZktecoDeviceDoc {
      _id: ObjectId;
      connectorId?: string;
      deviceName?: string;
      name?: string;
      ipAddress?: string;
      ip?: string;
    }

    const devices = await db.collection<ZktecoDeviceDoc>("ZktecoDevices").find({
      _id: { $in: deviceObjectIds }
    }).toArray();

    if (devices.length === 0) {
      return NextResponse.json({ data: null, message: "Không tìm thấy thiết bị nào hợp lệ" }, { status: 404 });
    }

    // Lấy Connector map để gọi qua Connector
    const connectorIds = Array.from(new Set(devices.map(d => d.connectorId?.toString()).filter(Boolean)));
    interface ZktecoConnectorDoc {
      _id: ObjectId;
      connectorUrl?: string;
    }

    const connectors = await db.collection<ZktecoConnectorDoc>("ZktecoConnectors").find({
      _id: { $in: connectorIds.map(id => new ObjectId(id as string)) }
    }).toArray();

    const connectorMap = new Map<string, ZktecoConnectorDoc>(connectors.map(c => [c._id.toString(), c]));

    const results = [];

    // Gọi API Connector cho từng Device
    for (const device of devices) {
      try {
        const connectorIdStr = device.connectorId?.toString();
        const connector = connectorIdStr ? connectorMap.get(connectorIdStr) : undefined;
        if (!connector || !connector.connectorUrl) {
          results.push({
            deviceId: device._id.toString(),
            deviceName: device.deviceName || device.name,
            success: false,
            message: "Máy chưa gắn với cổng nối (Connector) hợp lệ"
          });
          continue;
        }

        const payload = {
          action: 'delete_user',
          userid: String(userid),
        };

        const deviceIp = device.ipAddress || device.ip;
        if (!deviceIp) {
          results.push({
            deviceId: device._id.toString(),
            deviceName: device.deviceName || device.name,
            success: false,
            message: "Thiết bị không có địa chỉ IP"
          });
          continue;
        }

        const targetUrl = new URL(connector.connectorUrl);
        if (!targetUrl.pathname.endsWith('/')) {
            targetUrl.pathname += '/';
        }
        const actionUrl = new URL('api/zkteco/action', targetUrl);
        actionUrl.searchParams.set('ip', deviceIp);

        // Gửi header connectorId và target-ip cho connector
        const res = await fetch(actionUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-connector-id': connector._id.toString(),
            'x-target-ip': deviceIp,
            'x-api-key': process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY'
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        results.push({
          deviceId: device._id.toString(),
          deviceName: device.deviceName || device.name,
          success: data.success,
          message: data.message
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
      
      const syncDetailsUnset: Record<string, ""> = {};
      results.filter(r => r.success).forEach(r => {
        syncDetailsUnset[`zktecoSyncDetails.${r.deviceId}`] = "";
      });

      interface EmployeeDoc {
        _id: ObjectId;
        zktecoLinkedDevices?: string[];
        zktecoSyncDetails?: Record<string, unknown>;
      }

      await db.collection<EmployeeDoc>("employees-timekeeping").updateOne(
        { _id: new ObjectId(employeeId) },
        { 
          $pullAll: { zktecoLinkedDevices: successfulDeviceIds },
          $unset: syncDetailsUnset
        }
      );  
    }
    
    return NextResponse.json({
      data: results,
      message: `Đã xoá xong. Thành công: ${successCount}/${devices.length} máy.`
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
