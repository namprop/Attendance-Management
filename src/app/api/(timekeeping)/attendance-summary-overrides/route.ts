import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

const OVERRIDES_COLLECTION = "attendance_summary_overrides-timekeeping";
const OVERRIDE_LOGS_COLLECTION = "attendance_summary_override_logs-timekeeping";

const VALID_FIELDS = new Set(["work", "online", "overtime", "note"]);

const getString = (value: unknown) => (
  typeof value === "string" ? value.trim() : ""
);

const getValue = (value: unknown) => {
  if (typeof value === "number" || typeof value === "string") return value;
  return "";
};

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const periodFrom = getString(searchParams.get("periodFrom"));
    const periodTo = getString(searchParams.get("periodTo"));
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

    const overrides = await db
      .collection(OVERRIDES_COLLECTION)
      .find(filters)
      .toArray();

    return NextResponse.json({
      data: overrides.map((item) => ({
        ...item,
        _id: item._id.toString(),
      })),
      message: "Lấy dữ liệu sửa tay thành công",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi lấy dữ liệu sửa tay", error: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const employeeCode = getString(body.employeeCode);
    const employeeName = getString(body.employeeName);
    const departmentName = getString(body.departmentName);
    const date = getString(body.date);
    const periodFrom = getString(body.periodFrom);
    const periodTo = getString(body.periodTo);
    const field = getString(body.field);
    const value = getValue(body.value);
    const originalValue = getValue(body.originalValue);
    const reason = getString(body.reason);
    const updatedBy = getString(body.updatedBy) || "system";

    if (!employeeCode || !date || !VALID_FIELDS.has(field)) {
      return NextResponse.json(
        { data: null, message: "Thiếu employeeCode, date hoặc field không hợp lệ" },
        { status: 400 },
      );
    }

    const now = new Date();
    const filter = { employeeCode, date, field };
    const overridesCollection = db.collection(OVERRIDES_COLLECTION);
    await overridesCollection.createIndex({ employeeCode: 1, date: 1, field: 1 }, { unique: true });
    const previous = await overridesCollection.findOne(filter);

    const updateDoc = {
      employeeCode,
      employeeName,
      departmentName,
      date,
      periodFrom,
      periodTo,
      field,
      value,
      originalValue,
      reason,
      updatedBy,
      updatedAt: now,
    };

    const result = await overridesCollection.findOneAndUpdate(
      filter,
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );

    await db.collection(OVERRIDE_LOGS_COLLECTION).insertOne({
      overrideId: result?._id instanceof ObjectId ? result._id : null,
      employeeCode,
      employeeName,
      departmentName,
      date,
      periodFrom,
      periodTo,
      field,
      oldValue: previous?.value ?? originalValue,
      newValue: value,
      originalValue,
      reason,
      updatedBy,
      updatedAt: now,
    });

    return NextResponse.json({
      data: result ? { ...result, _id: result._id.toString() } : null,
      message: "Lưu sửa tay thành công",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi lưu sửa tay", error: errorMessage },
      { status: 500 },
    );
  }
}
