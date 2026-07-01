import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    const locations = await db
      .collection("locations-timekeeping")
      .find({ status: "ACTIVE" })
      .toArray();

    // Lấy tất cả branches để map tên (In-memory join)
    const branches = await db.collection("branch-timekeeping").find({}).toArray();
    const branchMap = new Map();
    branches.forEach(b => {
      branchMap.set(b._id.toString(), b.name || b.branchName || "Chi nhánh chưa đặt tên");
      if (b.id) branchMap.set(String(b.id), b.name || b.branchName || "Chi nhánh chưa đặt tên");
    });

    const mappedLocations = locations.map(loc => {
      const bId = loc.branchId ? String(loc.branchId) : "";
      return {
        _id: loc._id,
        id: loc._id.toString(),
        locationName: loc.locationName,
        locationSlug: loc.locationSlug,
        shortCode: loc.shortCode || "",
        coordinates: loc.coordinates,
        allowedRadiusMeters: loc.allowedRadiusMeters,
        branchId: loc.branchId,
        branchName: branchMap.get(bId) || "Không xác định",
      };
    });

    return NextResponse.json({
      data: mappedLocations,
      message: "Lấy danh sách cơ sở thành công",
    });
  } catch (error: unknown) {
    console.error("Lỗi lấy danh sách locations:", error);
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { locationName, locationSlug, shortCode, coordinates, allowedRadiusMeters, branchId } = body;

    if (!locationName || !branchId) {
      return NextResponse.json(
        { data: null, message: "Tên cơ sở và Chi nhánh là bắt buộc" },
        { status: 400 }
      );
    }

    let generatedSlug = locationSlug || '';
    if (!generatedSlug) {
      generatedSlug = locationName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    const existing = await db.collection("locations-timekeeping").findOne({ locationSlug: generatedSlug });
    if (existing) {
      return NextResponse.json(
        { data: null, message: "Đường dẫn (slug) này đã tồn tại" },
        { status: 409 }
      );
    }

    const locationObjectId = new ObjectId();
    const newLocation = {
      _id: locationObjectId,
      locationName,
      locationSlug: generatedSlug,
      shortCode: shortCode || "",
      coordinates: {
        lat: coordinates?.lat || 0,
        lng: coordinates?.lng || 0,
      },
      allowedRadiusMeters: allowedRadiusMeters || 100,
      branchId: branchId && ObjectId.isValid(branchId) ? new ObjectId(branchId) : branchId,
      status: "ACTIVE",
      createdAt: new Date(),
    };

    const result = await db.collection("locations-timekeeping").insertOne(newLocation);

    return NextResponse.json({
      data: { ...newLocation, _id: result.insertedId.toString() },
      message: "Thêm cơ sở thành công",
    });
  } catch (error: unknown) {
    console.error("Lỗi tạo location:", error);
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ" },
      { status: 500 }
    );
  }
}
export async function PUT(req: Request) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { _id, locationName, locationSlug, shortCode, coordinates, allowedRadiusMeters, branchId, status } = body;

    if (!_id) {
      return NextResponse.json({ data: null, message: "Thiếu ID cơ sở" }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (locationName !== undefined) updateFields.locationName = locationName;
    if (locationSlug !== undefined) updateFields.locationSlug = locationSlug;
    if (shortCode !== undefined) updateFields.shortCode = shortCode;
    if (coordinates !== undefined) updateFields.coordinates = coordinates;
    if (allowedRadiusMeters !== undefined) updateFields.allowedRadiusMeters = allowedRadiusMeters;
    if (branchId !== undefined) updateFields.branchId = branchId && ObjectId.isValid(branchId) ? new ObjectId(branchId) : branchId;
    if (status !== undefined) updateFields.status = status;
    updateFields.updatedAt = new Date();

    const result = await db.collection("locations-timekeeping").updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ data: null, message: "Không tìm thấy cơ sở" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Cập nhật cơ sở thành công" });
  } catch (error: unknown) {
    console.error("Lỗi cập nhật location:", error);
    return NextResponse.json({ data: null, message: "Lỗi server nội bộ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ data: null, message: "Thiếu ID cơ sở" }, { status: 400 });
    }

    // 1. Xóa các phòng ban (departments) thuộc cơ sở này
    await db.collection("departments_timekeeping").deleteMany({
      locationId: { $in: [new ObjectId(id), id] }
    });

    // 2. Xóa các khối cụm (department groups) thuộc cơ sở này
    await db.collection("department_groups_timekeeping").deleteMany({
      locationId: { $in: [new ObjectId(id), id] }
    });

    // 3. Xóa chính cơ sở này
    const result = await db.collection("locations-timekeeping").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ data: null, message: "Không tìm thấy cơ sở" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Xóa cơ sở thành công" });
  } catch (error: unknown) {
    console.error("Lỗi xóa location:", error);
    return NextResponse.json({ data: null, message: "Lỗi server nội bộ" }, { status: 500 });
  }
}
