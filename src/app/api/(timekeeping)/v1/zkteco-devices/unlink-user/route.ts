import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const payload = await request.json();
    const { employeeId, deviceIds } = payload;

    if (!employeeId || !deviceIds || !Array.isArray(deviceIds)) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const syncDetailsUnset: Record<string, ""> = {};
    deviceIds.forEach((deviceId: string) => {
      syncDetailsUnset[`zktecoSyncDetails.${deviceId}`] = "";
    });

    interface EmployeeDoc {
      _id: ObjectId;
      zktecoLinkedDevices?: string[];
      zktecoSyncDetails?: Record<string, unknown>;
    }

    const result = await db.collection<EmployeeDoc>("employees-timekeeping").updateOne(
      { _id: new ObjectId(employeeId as string) },
      { 
        $pullAll: { zktecoLinkedDevices: deviceIds },
        $unset: syncDetailsUnset
      }
    );

    if (result.modifiedCount === 0 && result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Đã gỡ liên kết thành công",
      data: {
        unlinkedDeviceIds: deviceIds
      }
    });

  } catch (error: unknown) {
    console.error("Lỗi unlink user:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
