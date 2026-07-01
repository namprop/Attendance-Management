import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { ObjectId } from "mongodb";
import { requirePermission } from "@/lib/auth-guard";

/**
 * GET /api/v1/kiosk/devices
 * Lấy danh sách tất cả thiết bị kiosk
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();

    const devices = await db
      .collection("kiosk_devices-timekeeping")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      data: devices,
      message: "Lấy danh sách thiết bị thành công",
    });
  } catch (error: unknown) {
    console.error("Lỗi GET kiosk devices:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/kiosk/devices
 * Thêm mới thiết bị kiosk
 * Body: { deviceName, ipAddress, locationId, locationSlug, locationName, note? }
 */
export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_kiosk_devices_create');
  if (permError) return permError;

  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { deviceName, ipAddress, locationId, locationSlug, locationName, note, tokenExpiry, requireGps } = body;

    let generatedSlug = locationSlug || '';
    if (!generatedSlug && locationName) {
      generatedSlug = locationName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    if (!deviceName || !ipAddress || !locationId || !generatedSlug || !locationName) {
      return NextResponse.json(
        { data: null, message: "Thiếu thông tin bắt buộc (deviceName, ipAddress, locationId, locationSlug, locationName)" },
        { status: 400 }
      );
    }

    // Kiểm tra IP đã tồn tại cho location này chưa
    const existing = await db.collection("kiosk_devices-timekeeping").findOne({
      ipAddress,
      locationSlug: generatedSlug,
    });

    if (existing) {
      return NextResponse.json(
        { data: null, message: `IP ${ipAddress} đã được đăng ký cho cơ sở "${locationName}".` },
        { status: 409 }
      );
    }

    const now = new Date();
    
    // Generate Short Token: K-XXXX-XXXX
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '', p2 = '';
    for(let i=0; i<4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for(let i=0; i<4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    const deviceToken = `K-${p1}-${p2}`;

    // Calculate expiresAt
    let expiresAt: Date | null = null;
    if (tokenExpiry === '3_months') expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    else if (tokenExpiry === '6_months') expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    else if (tokenExpiry === '1_year') expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    else if (tokenExpiry === '2_years') expiresAt = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000);

    const newDevice = {
      deviceName,
      ipAddress,
      locationId: locationId && ObjectId.isValid(locationId) ? new ObjectId(locationId) : locationId,
      locationSlug: generatedSlug,
      locationName,
      status: "ACTIVE" as const,
      deviceToken, // Lưu mã ngắn vào DB
      tokenExpiry: tokenExpiry || 'never',
      expiresAt, // Lưu ngày hết hạn trực tiếp
      note: note || "",
      requireGps: requireGps !== false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("kiosk_devices-timekeeping").insertOne(newDevice);

    return NextResponse.json({
      data: { _id: result.insertedId, ...newDevice },
      message: `Thêm thiết bị "${deviceName}" thành công.`,
    });
  } catch (error: unknown) {
    console.error("Lỗi POST kiosk devices:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/kiosk/devices
 * Cập nhật thiết bị kiosk
 * Body: { _id, deviceName?, ipAddress?, status?, note? }
 */
export async function PUT(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { _id, ...updateFields } = body;

    if (!_id) {
      return NextResponse.json(
        { data: null, message: "Thiếu ID thiết bị (_id)" },
        { status: 400 }
      );
    }

    // Nếu đổi IP, kiểm tra trùng
    if (updateFields.ipAddress && updateFields.locationSlug) {
      const existing = await db.collection("kiosk_devices-timekeeping").findOne({
        ipAddress: updateFields.ipAddress,
        locationSlug: updateFields.locationSlug,
        _id: { $ne: new ObjectId(_id) },
      });

      if (existing) {
        return NextResponse.json(
          { data: null, message: `IP ${updateFields.ipAddress} đã được đăng ký cho cơ sở khác.` },
          { status: 409 }
        );
      }
    }

    // Cập nhật gia hạn Token nếu admin đổi tokenExpiry
    if (updateFields.tokenExpiry) {
      const now = new Date();
      // Generate new short token
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let p1 = '', p2 = '';
      for(let i=0; i<4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      for(let i=0; i<4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
      updateFields.deviceToken = `K-${p1}-${p2}`;

      let expiresAt: Date | null = null;
      const expiry = updateFields.tokenExpiry;
      if (expiry === '3_months') expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      else if (expiry === '6_months') expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      else if (expiry === '1_year') expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      else if (expiry === '2_years') expiresAt = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000);
      
      updateFields.expiresAt = expiresAt;
    }

    if (updateFields.locationId && typeof updateFields.locationId === 'string' && ObjectId.isValid(updateFields.locationId)) {
      updateFields.locationId = new ObjectId(updateFields.locationId);
    }

    const result = await db.collection("kiosk_devices-timekeeping").updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy thiết bị." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { _id, ...updateFields },
      message: "Cập nhật thiết bị thành công.",
    });
  } catch (error: unknown) {
    console.error("Lỗi PUT kiosk devices:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/kiosk/devices
 * Xóa thiết bị kiosk
 * Body: { _id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { _id } = body;

    if (!_id) {
      return NextResponse.json(
        { data: null, message: "Thiếu ID thiết bị (_id)" },
        { status: 400 }
      );
    }

    const result = await db.collection("kiosk_devices-timekeeping").deleteOne({
      _id: new ObjectId(_id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy thiết bị để xóa." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { _id },
      message: "Xóa thiết bị thành công.",
    });
  } catch (error: unknown) {
    console.error("Lỗi DELETE kiosk devices:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
