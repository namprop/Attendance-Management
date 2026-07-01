import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_devices');
  if (permError) return permError;

  try {
    const { employeeId, deviceId } = await req.json();
    if (!employeeId || !deviceId) {
      return NextResponse.json({ data: null, message: "Thiếu employeeId hoặc deviceId" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection("employees-timekeeping").updateOne(
      { _id: new ObjectId(employeeId) },
      { 
        $set: { 
          [`zktecoSyncDetails.${deviceId}.hasFingerprint`]: true,
          [`zktecoSyncDetails.${deviceId}.fingerprintUpdatedAt`]: new Date().toISOString()
        },
        $inc: {
          [`zktecoSyncDetails.${deviceId}.fingerCount`]: 1
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ data: null, message: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Đã đánh dấu vân tay thành công"
    });

  } catch (error: unknown) {
    console.error("Lỗi mark fingerprint:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
