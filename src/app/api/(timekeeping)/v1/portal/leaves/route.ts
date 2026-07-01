import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const { type, date, reason, employeeId } = await req.json();

    if (!type || !date || !reason || !employeeId) {
      return NextResponse.json({ message: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const newLeave = {
      employeeId: new ObjectId(employeeId),
      type,
      date: new Date(date),
      reason,
      status: "PENDING",
      createdAt: new Date(),
    };

    const result = await db.collection("leaves-timekeeping").insertOne(newLeave);

    return NextResponse.json({
      message: "Gửi đơn xin phép thành công",
      data: {
        id: result.insertedId,
        ...newLeave
      }
    });
  } catch (error) {
    console.error("Lỗi khi tạo đơn xin phép:", error);
    return NextResponse.json({ message: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}
