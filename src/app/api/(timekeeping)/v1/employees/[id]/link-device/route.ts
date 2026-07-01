import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  // We can use either the 'timekeeping_members_edit' permission or trust x-api-key which `requirePermission` also allows
  const permError = await requirePermission(req, 'timekeeping_members_edit');
  if (permError) return permError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { data: null, message: "ID nhân sự không hợp lệ." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const body = await req.json();
    const { deviceId, deviceIp } = body;

    let targetDeviceId = deviceId;

    // Resolve deviceIp to deviceId if deviceId is not provided
    if (!targetDeviceId && deviceIp) {
      const device = await db.collection("ZktecoDevices").findOne({ 
        $or: [{ ip: deviceIp }, { ipAddress: deviceIp }] 
      });
      if (device) {
        targetDeviceId = device._id.toString();
      }
    }

    if (!targetDeviceId) {
      return NextResponse.json(
        { data: null, message: "Thiếu thông tin deviceId hoặc không tìm thấy máy chấm công với IP đã cung cấp." },
        { status: 400 }
      );
    }

    // Safely add deviceId to zktecoLinkedDevices if not already there
    const result = await db.collection("employees-timekeeping").updateOne(
      { _id: new ObjectId(id) },
      { $addToSet: { zktecoLinkedDevices: targetDeviceId } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy nhân viên." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã liên kết máy chấm công thành công",
    });
  } catch (error: unknown) {
    console.error("Lỗi liên kết máy chấm công:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
