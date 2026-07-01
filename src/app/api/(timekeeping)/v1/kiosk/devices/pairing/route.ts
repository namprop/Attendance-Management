import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { ObjectId } from "mongodb";
import crypto from "crypto";
export async function POST(req: NextRequest) {
  try {
    const { deviceId } = await req.json();
    if (!deviceId) {
      return NextResponse.json({ message: "Thiếu ID thiết bị." }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    // Sinh ra mã kết nối ngẫu nhiên 8 ký tự, chỉ dùng 1 lần (Single-use OTP)
    const pairingToken = crypto.randomBytes(4).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    const result = await db.collection("kiosk_devices-timekeeping").updateOne(
      { _id: new ObjectId(deviceId) },
      {
        $set: {
          pairingToken: pairingToken,
          pairingExpiresAt: expiresAt,
        },
      }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Không tìm thấy thiết bị." }, { status: 404 });
    }
    return NextResponse.json({
      message: "Tạo mã kết nối thành công.",
      data: {
        pairingToken,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo mã kết nối:", error);
    return NextResponse.json({ message: "Lỗi hệ thống." }, { status: 500 });
  }
}