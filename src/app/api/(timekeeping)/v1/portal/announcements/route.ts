import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(20, parseInt(searchParams.get("limit") || "5", 10));
    const branchId = searchParams.get("branchId");

    const match: Record<string, unknown> = { isActive: { $ne: false } };
    if (branchId) {
      match.$or = [
        { targetBranchIds: { $exists: false } },
        { targetBranchIds: { $size: 0 } },
        { targetBranchIds: branchId },
      ];
    }

    const docs = await db
      .collection("announcements-timekeeping")
      .find(match)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const announcements = docs.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title || "",
      content: doc.content || "",
      createdAt: doc.createdAt,
      type: doc.type || "info", // info | warning | success
    }));

    return NextResponse.json({ data: announcements, message: "OK" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Lỗi lấy announcements:", error);
    return NextResponse.json(
      { data: [], message: "Lỗi server", error: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { title, content, type, targetBranchIds } = body as {
      title?: string;
      content?: string;
      type?: string;
      targetBranchIds?: string[];
    };

    if (!title || !content) {
      return NextResponse.json(
        { data: null, message: "Thiếu tiêu đề hoặc nội dung" },
        { status: 400 }
      );
    }

    const doc = {
      title,
      content,
      type: type || "info",
      targetBranchIds: targetBranchIds || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("announcements-timekeeping").insertOne(doc);
    return NextResponse.json({
      data: { id: result.insertedId.toString(), ...doc },
      message: "Tạo thông báo thành công",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server", error: msg },
      { status: 500 }
    );
  }
}
