import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

const OVERRIDE_LOGS_COLLECTION = "attendance_summary_override_logs-timekeeping";

const getString = (value: unknown) => (
  typeof value === "string" ? value.trim() : ""
);

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const periodFrom = getString(searchParams.get("periodFrom"));
    const periodTo = getString(searchParams.get("periodTo"));
    const search = getString(searchParams.get("search"));
    const employeeCodes = getString(searchParams.get("employeeCodes"))
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);

    const filters: Record<string, unknown> = {};
    if (periodFrom || periodTo) {
      filters.date = {
        ...(periodFrom ? { $gte: periodFrom } : {}),
        ...(periodTo ? { $lte: periodTo } : {}),
      };
    }
    if (employeeCodes.length > 0) {
      filters.employeeCode = { $in: employeeCodes };
    }
    if (search) {
      filters.$or = [
        { employeeCode: { $regex: search, $options: "i" } },
        { employeeName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await db.collection(OVERRIDE_LOGS_COLLECTION).countDocuments(filters);

    const logs = await db
      .collection(OVERRIDE_LOGS_COLLECTION)
      .find(filters)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return NextResponse.json({
      data: logs.map((item) => ({
        ...item,
        _id: item._id.toString(),
        overrideId: item.overrideId ? item.overrideId.toString() : null,
      })),
      total,
      page,
      pageSize,
      message: "Lấy dữ liệu log sửa tay thành công",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi lấy dữ liệu log sửa tay", error: errorMessage },
      { status: 500 },
    );
  }
}
