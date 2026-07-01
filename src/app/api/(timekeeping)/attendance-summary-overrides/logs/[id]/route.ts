import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

const OVERRIDE_LOGS_COLLECTION = "attendance_summary_override_logs-timekeeping";

const getString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID không hợp lệ" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection(OVERRIDE_LOGS_COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Không tìm thấy lịch sử" }, { status: 404 });
    }

    return NextResponse.json({ message: "Xóa bản ghi lịch sử thành công" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { message: "Lỗi xóa lịch sử", error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const reason = getString(body.reason);

    const { db } = await connectToDatabase();
    const result = await db.collection(OVERRIDE_LOGS_COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { $set: { reason, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Không tìm thấy lịch sử" }, { status: 404 });
    }

    return NextResponse.json({ message: "Cập nhật lý do thành công" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { message: "Lỗi cập nhật lịch sử", error: errorMessage },
      { status: 500 }
    );
  }
}
