import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

/**
 * POST /api/v1/kiosk/verify-device
 * Xác thực thiết bị kiosk bằng IP tĩnh
 * Body: { locationSlug: string, clientIp: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { locationSlug, clientIp, deviceToken } = body;

    if (!locationSlug || !clientIp || !deviceToken) {
      return NextResponse.json(
        { data: null, message: "Thiếu dữ liệu đầu vào (locationSlug, clientIp, deviceToken)" },
        { status: 400 }
      );
    }

    // 1. Tìm thiết bị khớp Token + locationSlug + đang ACTIVE
    const device = await db.collection("kiosk_devices-timekeeping").findOne({
      deviceToken: deviceToken,
      locationSlug: locationSlug,
      status: "ACTIVE",
    });

    if (!device) {
      return NextResponse.json(
        {
          data: { verified: false },
          message: "Mã Token không hợp lệ hoặc thiết bị chưa được cấp phép. Vui lòng kiểm tra lại.",
        },
        { status: 403 }
      );
    }

    // 2. Kiểm tra thời hạn (expiresAt)
    if (device.expiresAt && new Date(device.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        {
          data: { verified: false },
          message: "Mã Token của thiết bị đã HẾT HẠN. Vui lòng liên hệ Quản trị viên để gia hạn.",
        },
        { status: 403 }
      );
    }

    // 3. Kiểm tra vị trí (locationSlug) – đảm bảo thiết bị thuộc cơ sở yêu cầu
    if (device.locationSlug !== locationSlug) {
      return NextResponse.json(
        {
          data: { verified: false },
          message: "Thiết bị không thuộc vị trí yêu cầu. Vui lòng kiểm tra lại địa chỉ cơ sở.",
        },
        { status: 403 }
      );
    }

    // IP check (commented out for future use)
    // if (device.ipAddress !== clientIp) {
    //   return NextResponse.json(
    //     {
    //       data: { verified: false },
    //       message: "Bạn đang không kết nối vào mạng Wifi nội bộ của cơ sở này.",
    //     },
    //     { status: 403 }
    //   );
    // }

    return NextResponse.json({
      data: {
        verified: true,
        deviceName: device.deviceName,
        locationName: device.locationName,
        locationSlug: device.locationSlug,
        requireGps: device.requireGps !== false,
      },
      message: `Thiết bị "${device.deviceName}" đã được xác thực thành công.`,
    });
  } catch (error: unknown) {
    console.error("Lỗi verify-device:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
