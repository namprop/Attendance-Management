import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requireAuth } from "@/lib/auth-guard";

export async function PUT(req: NextRequest) {
  // 1. Kiểm tra đăng nhập (Bất kỳ user nào có accessToken hợp lệ)
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    // 2. Lấy thông tin user từ cookie info_user
    const infoUserCookie = req.cookies.get("info_user")?.value;
    if (!infoUserCookie) {
      return NextResponse.json({ message: "Không tìm thấy phiên đăng nhập." }, { status: 401 });
    }

    let userObj;
    try {
      userObj = JSON.parse(infoUserCookie);
    } catch {
      return NextResponse.json({ message: "Cookie không hợp lệ." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const body = await req.json();

    // 3. Xác định ID nhân viên (Ưu tiên ID truyền từ giao diện, rồi mới đến Cookie)
    let employeeId = body.employeeId || userObj.employeeId || userObj._id || userObj.id || body._id || body.id;
    
    if (!employeeId || !ObjectId.isValid(employeeId)) {
      // Fallback: Tìm bằng employeeCode
      if (userObj.employeeCode) {
        const emp = await db.collection("employees-timekeeping").findOne({ employeeCode: userObj.employeeCode });
        if (emp) {
          employeeId = emp._id.toString();
        }
      }
    }

    if (!employeeId || !ObjectId.isValid(employeeId)) {
      return NextResponse.json({ message: "Không xác định được ID nhân viên. Vui lòng đăng nhập lại." }, { status: 400 });
    }

    // 4. Chỉ lấy các trường ĐƯỢC PHÉP chỉnh sửa (Editable Fields)
    const { 
      phone, 
      email, 
      gender, 
      dateOfBirth, 
      address, 
      nativePlace, 
      ethnicity, 
      nationality,
      identityCard,
      bankAccount,
      bankName,
      taxCode,
      avatar
    } = body;

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (phone !== undefined) updateFields.phone = phone;
    if (email !== undefined) updateFields.email = email;
    if (gender !== undefined) updateFields.gender = gender;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (address !== undefined) updateFields.address = address;
    if (nativePlace !== undefined) updateFields.nativePlace = nativePlace;
    if (ethnicity !== undefined) updateFields.ethnicity = ethnicity;
    if (nationality !== undefined) updateFields.nationality = nationality;
    if (identityCard !== undefined) updateFields.identityCard = identityCard;
    if (bankAccount !== undefined) updateFields.bankAccount = bankAccount;
    if (bankName !== undefined) updateFields.bankName = bankName;
    if (taxCode !== undefined) updateFields.taxCode = taxCode;
    if (avatar !== undefined) updateFields.avatar = avatar;

    // 5. Thực hiện cập nhật
    const result = await db.collection("employees-timekeeping").updateOne(
      { _id: new ObjectId(employeeId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy hồ sơ nhân sự của bạn." },
        { status: 404 }
      );
    }

    // 6. Cập nhật Email bên bảng Users nếu có thay đổi Email
    if (email !== undefined && userObj.employeeCode) {
      try {
        await db.collection("Users").updateOne(
          { employeeCode: userObj.employeeCode },
          { $set: { email: email } }
        );
      } catch (authErr) {
        console.error("Lỗi đồng bộ Auth User khi update profile:", authErr);
      }
    }

    return NextResponse.json({
      data: { id: employeeId, ...updateFields },
      message: "Cập nhật hồ sơ thành công",
    });
  } catch (error: unknown) {
    console.error("Lỗi cập nhật profile portal:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
