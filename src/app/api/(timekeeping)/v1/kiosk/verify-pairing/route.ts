import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
export async function POST(req: NextRequest) {
  try {
    const { pairingToken, locationSlug } = await req.json();
    if (!pairingToken || !locationSlug) {
      return NextResponse.json({ message: "Thiếu dữ liệu kết nối." }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    const device = await db.collection("kiosk_devices-timekeeping").findOne({
      pairingToken: pairingToken.toUpperCase(),
      locationSlug: locationSlug,
      status: "ACTIVE",
    });
    if (!device) {
      return NextResponse.json({ message: "Mã kết nối không hợp lệ hoặc đã được sử dụng." }, { status: 403 });
    }
    // Kiểm tra hạn (5 phút)
    if (device.pairingExpiresAt && new Date() > new Date(device.pairingExpiresAt)) {
      return NextResponse.json({ message: "Mã QR đã hết hạn. Vui lòng tạo mã mới." }, { status: 403 });
    }
    // Tiêu hủy mã (Single-use)
    await db.collection("kiosk_devices-timekeeping").updateOne(
      { _id: device._id },
      {
        $set: {
          pairingToken: null,
          pairingExpiresAt: null,
        },
      }
    );
    return NextResponse.json({
      message: "Kết nối thiết bị thành công.",
      data: {
        deviceToken: device.deviceToken,
        deviceName: device.deviceName,
      },
    });
  } catch (error) {
    console.error("Lỗi xác thực mã kết nối:", error);
    return NextResponse.json({ message: "Lỗi hệ thống." }, { status: 500 });
  }
}