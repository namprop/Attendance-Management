import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Chỉ cần query những thiết bị có isOnline = true do Connector cập nhật
    const devices = await db.collection("ZktecoDevices").find({ isOnline: true }).toArray();
    
    const activeDeviceIds = devices.map(d => d._id.toString());

    return NextResponse.json({ success: true, data: activeDeviceIds });
  } catch (error: unknown) {
    console.error("Lỗi lấy trạng thái kết nối:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server nội bộ" },
      { status: 500 }
    );
  }
}
