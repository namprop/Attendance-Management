import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { ObjectId } from "mongodb";

// Hàm tính khoảng cách Euclid giữa 2 vector khuôn mặt
function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
}

// Kiểm tra trùng mặt với tất cả nhân viên khác
async function checkDuplicateFace(
  db: Awaited<ReturnType<typeof connectToDatabase>>['db'],
  faceVectors: number[][],
  employeeId: ObjectId,
  employeeLocationId: string | undefined,
  force: boolean
): Promise<{ duplicate: Record<string, unknown> | null; minDistance: number; isSameLocation: boolean }> {
  const matchThreshold = 0.45;

  const otherEmployees = await db.collection("employees-timekeeping").find({
    _id: { $ne: employeeId },
    $or: [
      { "biometricData.faceVectors": { $exists: true, $not: { $size: 0 } } },
      { "biometricData.faceVector": { $exists: true } }
    ]
  }).toArray();

  let duplicateEmployee: Record<string, unknown> | null = null;
  let minDistance = 999;

  for (const emp of otherEmployees) {
    const isSameLocation = emp.locationId?.toString() === employeeLocationId;

    // Nếu force=true và khác cơ sở → bỏ qua kiểm tra
    if (force && !isSameLocation) continue;

    const bio = emp.biometricData;
    if (!bio) continue;

    let matched = false;

    // Kiểm tra từng faceVector mới đang lưu với từng slot của nhân viên khác
    for (const newVec of faceVectors) {
      if (Array.isArray(bio.faceVectors)) {
        for (const storedVec of bio.faceVectors) {
          if (Array.isArray(storedVec) && storedVec.length === 128) {
            const dist = euclideanDistance(newVec, storedVec);
            if (dist < matchThreshold && dist < minDistance) {
              minDistance = dist;
              duplicateEmployee = emp;
              matched = true;
            }
          }
        }
      }

      // Tương thích ngược: faceVector đơn lẻ
      if (Array.isArray(bio.faceVector) && bio.faceVector.length === 128) {
        const dist = euclideanDistance(newVec, bio.faceVector);
        if (dist < matchThreshold && dist < minDistance) {
          minDistance = dist;
          duplicateEmployee = emp;
          matched = true;
        }
      }

      if (matched) break;
    }

    if (duplicateEmployee) break;
  }

  const isSameLocation = duplicateEmployee
    ? (duplicateEmployee.locationId as string | undefined)?.toString() === employeeLocationId
    : false;

  return { duplicate: duplicateEmployee, minDistance, isSameLocation };
}

// GET: Lấy trạng thái đã quét (boolean) của 10 slot Face ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);

    const employee = await db.collection("employees-timekeeping").findOne({ _id: objectId });
    if (!employee) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy nhân viên" },
        { status: 404 }
      );
    }

    const bio = employee.biometricData || {};
    const faceVectors: unknown[] = Array.isArray(bio.faceVectors) ? bio.faceVectors : [];

    // Khởi tạo mảng 10 slot, kiểm tra xem slot nào chứa mảng 128 số thực hợp lệ
    const slots = Array.from({ length: 10 }, (_, i) => {
      const vec = faceVectors[i];
      return Array.isArray(vec) && vec.length === 128;
    });

    // Tương thích ngược: slot 0 trống nhưng có biometricData.faceVector cũ
    if (!slots[0] && Array.isArray(bio.faceVector) && bio.faceVector.length === 128) {
      slots[0] = true;
    }

    return NextResponse.json({
      data: { slots },
      message: "Lấy trạng thái slot Face ID thành công"
    });
  } catch (error: unknown) {
    console.error("Lỗi lấy trạng thái slot Face ID:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT: Đăng ký Face ID
// Mode 1 (Bulk Atomic): body = { faceVectors: number[][], force?: boolean } — lưu tất cả 5 góc atomically
// Mode 2 (Single):      body = { faceVector: number[], index: number, force?: boolean } — lưu 1 góc (chế độ thủ công)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const body = await req.json() as {
      faceVectors?: number[][];
      faceVector?: number[];
      index?: number;
      force?: boolean;
    };

    const { force = false } = body;
    const isBulkMode = Array.isArray(body.faceVectors);

    const objectId = new ObjectId(id);
    const employee = await db.collection("employees-timekeeping").findOne({ _id: objectId });
    if (!employee) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy nhân viên" },
        { status: 404 }
      );
    }

    // ============================
    // BULK MODE: Lưu nhiều vector cùng lúc (Atomic)
    // ============================
    if (isBulkMode) {
      const inputVectors = body.faceVectors!;

      // Validate: mỗi vector phải là mảng 128 số
      for (let i = 0; i < inputVectors.length; i++) {
        const vec = inputVectors[i];
        if (!Array.isArray(vec) || vec.length !== 128) {
          return NextResponse.json(
            { data: null, message: `faceVectors[${i}] không hợp lệ (yêu cầu mảng 128 phần tử)` },
            { status: 400 }
          );
        }
      }

      if (inputVectors.length === 0) {
        return NextResponse.json(
          { data: null, message: "faceVectors không được rỗng" },
          { status: 400 }
        );
      }

      // Kiểm tra trùng mặt với toàn bộ vector mới
      const { duplicate, minDistance, isSameLocation } = await checkDuplicateFace(
        db, inputVectors, objectId, employee.locationId?.toString(), force
      );

      if (duplicate) {
        const similarityPercent = minDistance < 999
          ? Math.max(0, Math.min(100, Math.round((1 - minDistance) * 100)))
          : 99;

        return NextResponse.json(
          {
            success: false,
            isHardBlock: isSameLocation,
            message: isSameLocation
              ? `Khuôn mặt này đã thuộc về nhân viên "${duplicate.fullName}" (Mã: ${duplicate.employeeCode}) ở cùng cơ sở. Không thể đăng ký trùng lặp!`
              : `Khuôn mặt này đã thuộc về nhân viên "${duplicate.fullName}" (Mã: ${duplicate.employeeCode}) ở cơ sở khác. Bạn có muốn tiếp tục đăng ký không?`,
            data: {
              duplicateEmployee: {
                id: (duplicate._id as ObjectId).toString(),
                fullName: duplicate.fullName,
                employeeCode: duplicate.employeeCode,
                role: duplicate.role || "Nhân viên",
                avatar: duplicate.avatar || "User",
                locationId: duplicate.locationId || ""
              },
              metrics: {
                distance: parseFloat(minDistance.toFixed(4)),
                similarity: similarityPercent,
                matchThreshold: 0.45
              }
            }
          },
          { status: 409 }
        );
      }

      // Lấy mảng vector hiện tại và ghi đè các slot 0-4 (atomic)
      const bio = employee.biometricData || {};
      const existingVectors: unknown[] = Array.isArray(bio.faceVectors) ? [...bio.faceVectors] : [];

      for (let i = 0; i < inputVectors.length; i++) {
        existingVectors[i] = inputVectors[i];
      }

      // Cắt tối đa 10 slot
      const finalVectors = existingVectors.slice(0, 10);

      await db.collection("employees-timekeeping").updateOne(
        { _id: objectId },
        {
          $set: {
            "biometricData.faceVectors": finalVectors,
            "biometricData.faceVector": inputVectors[0], // Tương thích ngược
            "biometricData.faceEnrolled": true,
            faceEnrolled: true,
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        data: { success: true, savedCount: inputVectors.length },
        message: `Đăng ký thành công ${inputVectors.length} góc Face ID`
      });
    }

    // ============================
    // SINGLE MODE: Lưu 1 vector (chế độ thủ công)
    // ============================
    const { faceVector, index = 0 } = body;
    const slotIndex = Number(index);

    if (!faceVector || !Array.isArray(faceVector) || faceVector.length !== 128) {
      return NextResponse.json(
        { data: null, message: "Dữ liệu faceVector không hợp lệ (yêu cầu mảng 128 phần tử)" },
        { status: 400 }
      );
    }

    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 9) {
      return NextResponse.json(
        { data: null, message: "Index slot không hợp lệ (yêu cầu số nguyên từ 0 đến 9)" },
        { status: 400 }
      );
    }

    // Kiểm tra trùng mặt
    const { duplicate, minDistance, isSameLocation } = await checkDuplicateFace(
      db, [faceVector], objectId, employee.locationId?.toString(), force
    );

    if (duplicate) {
      const similarityPercent = minDistance < 999
        ? Math.max(0, Math.min(100, Math.round((1 - minDistance) * 100)))
        : 99;

      return NextResponse.json(
        {
          success: false,
          isHardBlock: isSameLocation,
          message: isSameLocation
            ? `Khuôn mặt này đã thuộc về nhân viên "${duplicate.fullName}" (Mã: ${duplicate.employeeCode}) ở cùng cơ sở. Không thể đăng ký trùng lặp!`
            : `Khuôn mặt này đã thuộc về nhân viên "${duplicate.fullName}" (Mã: ${duplicate.employeeCode}) ở cơ sở khác. Bạn có muốn tiếp tục đăng ký không?`,
          data: {
            duplicateEmployee: {
              id: (duplicate._id as ObjectId).toString(),
              fullName: duplicate.fullName,
              employeeCode: duplicate.employeeCode,
              role: duplicate.role || "Nhân viên",
              avatar: duplicate.avatar || "User",
              locationId: duplicate.locationId || ""
            },
            metrics: {
              distance: parseFloat(minDistance.toFixed(4)),
              similarity: similarityPercent,
              matchThreshold: 0.45
            }
          }
        },
        { status: 409 }
      );
    }

    const bio = employee.biometricData || {};
    const faceVectors: unknown[] = Array.isArray(bio.faceVectors) ? [...bio.faceVectors] : [];

    faceVectors[slotIndex] = faceVector;

    const updateDoc: Record<string, unknown> = {
      "biometricData.faceVectors": faceVectors.slice(0, 10),
      "biometricData.faceEnrolled": true,
      faceEnrolled: true,
      updatedAt: new Date()
    };

    // Tương thích ngược
    if (slotIndex === 0) {
      updateDoc["biometricData.faceVector"] = faceVector;
    }

    await db.collection("employees-timekeeping").updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    return NextResponse.json({
      data: { success: true },
      message: `Đăng ký Face ID thành công tại Slot ${slotIndex + 1}`
    });

  } catch (error: unknown) {
    console.error("Lỗi cập nhật Face ID:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE: Xóa dữ liệu Face ID của một slot cụ thể (từ 0 đến 9)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const indexStr = searchParams.get("index");

    const objectId = new ObjectId(id);
    const employee = await db.collection("employees-timekeeping").findOne({ _id: objectId });
    if (!employee) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy nhân viên" },
        { status: 404 }
      );
    }

    if (!indexStr || indexStr === "all") {
      // Xóa toàn bộ dữ liệu Face ID
      await db.collection("employees-timekeeping").updateOne(
        { _id: objectId },
        {
          $set: { updatedAt: new Date(), faceEnrolled: false },
          $unset: {
            "biometricData.faceVectors": "",
            "biometricData.faceVector": "",
            "biometricData.faceEnrolled": ""
          }
        }
      );
      return NextResponse.json({
        data: null,
        message: "Đã xóa toàn bộ dữ liệu Face ID thành công"
      });
    }

    const slotIndex = Number(indexStr);
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 9) {
      return NextResponse.json(
        { data: null, message: "Index slot không hợp lệ (yêu cầu số nguyên từ 0 đến 9)" },
        { status: 400 }
      );
    }

    const bio = employee.biometricData || {};
    const faceVectors: unknown[] = Array.isArray(bio.faceVectors) ? [...bio.faceVectors] : [];

    // Gán null vào slot tương ứng để giữ nguyên thứ tự các index khác
    faceVectors[slotIndex] = null;

    const updateDoc: Record<string, unknown> = {
      "biometricData.faceVectors": faceVectors.slice(0, 10),
      updatedAt: new Date()
    };

    // Tương thích ngược: nếu xóa slot 0 thì cũng xóa faceVector đơn lẻ
    if (slotIndex === 0) {
      updateDoc["biometricData.faceVector"] = null;
    }

    // Kiểm tra xem còn slot nào hợp lệ không để cập nhật faceEnrolled
    const hasAnyValid = faceVectors.some(
      (v, i) => i !== slotIndex && Array.isArray(v) && (v as number[]).length === 128
    );
    updateDoc["faceEnrolled"] = hasAnyValid;
    updateDoc["biometricData.faceEnrolled"] = hasAnyValid;

    await db.collection("employees-timekeeping").updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    return NextResponse.json({
      data: { success: true },
      message: `Đã xóa Face ID tại Slot ${slotIndex + 1} thành công`
    });
  } catch (error: unknown) {
    console.error("Lỗi xóa Face ID:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
