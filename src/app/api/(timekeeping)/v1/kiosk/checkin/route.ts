import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { ObjectId } from "mongodb";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Kích hợp Timezone chuẩn Việt Nam
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

import {
  buildCheckInPayload,
  buildCheckOutPayload,
  getEmployeeDepartmentGroupId,
  getEmployeeGroup,
  getEmployeeWorkType,
} from "@/app/lib/timekeeping/attendanceService";
import type { ShiftConfig } from "@/app/interface/timekeeping";
import { validateGPS } from "@/app/lib/timekeeping/gpsService";
import { findBestFaceMatch, verifyLiveness } from "@/app/lib/timekeeping/faceRecognitionService";

import { Filter, Document } from "mongodb";

type KioskEmployeeLike = {
  role?: string;
  employeeType?: string;
  departmentId?: string;
  deptGroupId?: string;
  locationId?: string;
  departmentName?: string;
  departmentGroupName?: string;
  locationName?: string;
} & Record<string, unknown>;

// Type rõ ràng cho document employee lấy từ MongoDB
interface EmployeeDoc {
  _id: ObjectId;
  employeeCode: string;
  fullName: string;
  role?: string;
  avatar?: string;
  locationId?: string | ObjectId;
  branchId?: string | ObjectId;
  departmentId?: string;
  deptGroupId?: string;
  employeeType?: string;
  biometricData?: {
    faceVectors?: number[][];
    faceVector?: number[];
  };
  [key: string]: unknown;
}

const getObjectId = (value: unknown) => {
  if (typeof value !== "string" || !ObjectId.isValid(value)) return null;
  return new ObjectId(value);
};

const getStringField = (document: Record<string, unknown> | null, key: string) => {
  const value = document?.[key];
  return typeof value === "string" ? value : "";
};

async function enrichEmployeeGroupFields(
  db: Awaited<ReturnType<typeof connectToDatabase>>["db"],
  employee: KioskEmployeeLike,
  fallbackLocationName: string,
) {
  const departmentObjectId = getObjectId(employee.departmentId);

  const department = departmentObjectId
    ? await db.collection("departments_timekeeping").findOne({ _id: departmentObjectId })
    : null;
  const groupId = getStringField(employee, "deptGroupId") || getStringField(department, "departmentGroupTimekeepingId");
  const groupObjectId = getObjectId(groupId);
  const group = groupObjectId
    ? await db.collection("department_groups_timekeeping").findOne({ _id: groupObjectId })
    : null;

  return {
    ...employee,
    deptGroupId: groupId,
    departmentName: getStringField(department, "name"),
    departmentGroupName: getStringField(group, "name"),
    locationName: fallbackLocationName,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { locationSlug, faceVector, challengeFaceVector, challengeDirection, gps, snapshotBase64, deviceToken } = body;

    if (!locationSlug || !faceVector || !challengeFaceVector || typeof challengeDirection !== "number" || !gps || !gps.latitude || !gps.longitude) {
      return NextResponse.json(
        { data: null, message: "Thiếu dữ liệu đầu vào bắt buộc hoặc thiếu dữ liệu chống giả mạo (Liveness)." },
        { status: 400 }
      );
    }

    // 1. LẤY THÔNG TIN LOCATION & DEVICE
    const location = await db.collection("locations-timekeeping").findOne({ locationSlug });
    if (!location) {
      return NextResponse.json({ data: null, message: "Không tìm thấy cơ sở (Location) này." }, { status: 404 });
    }

    if (!deviceToken) {
      return NextResponse.json({ data: null, message: "Yêu cầu mã xác thực thiết bị (deviceToken)." }, { status: 403 });
    }

    const device = await db.collection("kiosk_devices-timekeeping").findOne({
      deviceToken: deviceToken,
      locationSlug: locationSlug,
    });

    if (!device || device.status !== "ACTIVE") {
      return NextResponse.json(
        { data: null, message: "Thiết bị Kiosk không được cấp phép hoặc đã bị vô hiệu hóa." },
        { status: 403 }
      );
    }

    // 2. VALIDATE GPS (Sử dụng Service)
    const locLat = location?.coordinates?.lat || location?.coordinates?.latitude || 0;
    const locLng = location?.coordinates?.lng || location?.coordinates?.longitude || 0;
    const skipGpsCheck = device?.requireGps === false;

    const gpsResult = validateGPS(
      { latitude: gps.latitude, longitude: gps.longitude },
      { lat: locLat, lng: locLng, radiusMeters: location.allowedRadiusMeters || 100 },
      skipGpsCheck
    );

    if (!skipGpsCheck && !gpsResult.isValid) {
      return NextResponse.json({ data: null, message: gpsResult.message }, { status: 403 });
    }

    // 3. NHẬN DIỆN KHUÔN MẶT & CHỐNG GIẢ MẠO (Liveness)
    const orConditions: Filter<Document>[] = [
      { locationId: location._id.toString() },
      { locationId: location._id }
    ];

    if (location.branchId) {
      orConditions.push({ branchId: location.branchId.toString() });
      if (typeof location.branchId === 'string' && /^[0-9a-fA-F]{24}$/.test(location.branchId)) {
        orConditions.push({ branchId: new ObjectId(location.branchId) });
      } else if (location.branchId instanceof ObjectId) {
        orConditions.push({ branchId: location.branchId });
      }
    }

    const employees = await db.collection<EmployeeDoc>("employees-timekeeping").find({
      $or: orConditions
    }).toArray();

    const faceMatch = findBestFaceMatch(faceVector, employees as unknown as Record<string, unknown>[]);
    if (!faceMatch.isMatch || !faceMatch.bestMatchEmployee) {
      return NextResponse.json(
        { data: null, message: "Không nhận diện được khuôn mặt. Bạn chưa đăng ký hoặc đứng quá xa." },
        { status: 404 }
      );
    }

    const bestMatch = faceMatch.bestMatchEmployee as unknown as EmployeeDoc;

    const liveness = verifyLiveness(bestMatch, challengeFaceVector, challengeDirection);
    if (!liveness.isVerified) {
      return NextResponse.json({ data: null, message: liveness.message }, { status: 403 });
    }

    // 4. DEBOUNCE CHỐNG SPAM (10 Giây)
    const now = dayjs().tz("Asia/Ho_Chi_Minh").toDate();
    const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);

    const existingLog = await db.collection("attendance_logs-timekeeping").findOne({
      employeeCode: bestMatch.employeeCode,
      locationId: location._id.toString(),
      scanTime: { $gte: tenSecondsAgo }
    });

    if (existingLog) {
      return NextResponse.json(
        {
          data: {
            success: true,
            employeeCode: bestMatch.employeeCode,
            fullName: bestMatch.fullName,
            role: bestMatch.role || "Nhân viên",
            locationName: location.locationName || locationSlug,
            avatar: bestMatch.avatar || "User",
            euclideanDistance: faceMatch.minDistance,
          },
          message: `Bạn vừa mới chấm công xong! Chào ${bestMatch.fullName}!`,
        },
        { status: 200 }
      );
    }

    // 5. GHI LOG CHẤM CÔNG (Bằng chứng)
    await db.collection("attendance_logs-timekeeping").insertOne({
      employeeCode: bestMatch.employeeCode,
      locationId: location._id.toString(),
      locationSlug: locationSlug,
      scanTime: now,
      businessDate: dayjs(now).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"),
      authMode: "FACE_KIOSK",
      gpsLocation: gps,
      isLocationValid: gpsResult.isValid,
      euclideanDistance: faceMatch.minDistance,
      matchedSlotIndex: faceMatch.matchedSlotIndex, // Slot nào khớp tốt nhất
      snapshotBase64: snapshotBase64 || null,
      createdAt: now,
    });

    // 6. TÍNH TOÁN CA LÀM & TẠO TIME RECORD
    const dateStr = dayjs(now).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
    const timeStr = dayjs(now).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");

    const employeeWithGroupFields = await enrichEmployeeGroupFields(
      db,
      bestMatch as KioskEmployeeLike,
      location.locationName || locationSlug,
    );
    const employeeGroup = getEmployeeGroup(employeeWithGroupFields);
    const employeeDepartmentGroupId = getEmployeeDepartmentGroupId(employeeWithGroupFields);
    const employeeWorkType = getEmployeeWorkType(employeeWithGroupFields);
    const shifts = await db.collection<ShiftConfig>("shift_configs-timekeeping").find({ isActive: true }).toArray();

    // TÌM BẢN GHI CHECK-IN GẦN NHẤT TRONG VÒNG 14 TIẾNG (Fix lỗi Ca đêm)
    const fourteenHoursAgo = dayjs(now).tz("Asia/Ho_Chi_Minh").subtract(14, 'hour').toDate();
    const recentRecords = await db.collection("time_records-timekeeping")
      .find({
        employeeId: bestMatch.employeeCode,
        createdAt: { $gte: fourteenHoursAgo }
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    const latestRecord = recentRecords.length > 0 ? recentRecords[0] : null;
    const isCheckOut = Boolean(latestRecord?.clockIn && !latestRecord.clockOut);

    let checkAction = "";
    let lateMins = 0;
    let earlyMins = 0;
    let currentShiftName = "";

    if (!isCheckOut || !latestRecord) {
      // TẠO CHECK-IN MỚI
      const payload = buildCheckInPayload({
        employeeId: bestMatch.employeeCode,
        date: dateStr, // Luôn gán date là ngày hiện tại lúc quét
        timeStr,
        deviceType: "FaceID",
        shifts,
        employeeGroup,
        employeeDepartmentGroupId,
        employeeWorkType,
        employeeBranchId: bestMatch.branchId?.toString(),
        employeeLocationId: location._id.toString(),
        employeeDepartmentId: bestMatch.departmentId?.toString(),
      });

      checkAction = "CHECK_IN";
      lateMins = payload.lateMinutes;

      const matchedShift = shifts.find(
        (s) => s._id?.toString() === payload.shiftId?.toString()
      );
      currentShiftName = matchedShift ? matchedShift.name : "";

      await db.collection("time_records-timekeeping").insertOne({
        employeeId: payload.employeeId,
        date: payload.date,
        clockIn: payload.clockIn,
        clockOut: payload.clockOut,
        shiftId: payload.shiftId,
        deviceType: payload.deviceType,
        gpsMatched: gpsResult.isValid,
        lateMinutes: payload.lateMinutes,
        earlyMinutes: payload.earlyMinutes,
        reasonApproved: payload.reasonApproved,
        locationId: location._id.toString(),
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // TẠO CHECK-OUT (Cập nhật bản ghi cũ)
      const payload = buildCheckOutPayload({
        recordId: latestRecord._id.toString(),
        timeStr,
        clockInTime: latestRecord.clockIn,
        existingShiftId: latestRecord.shiftId,
        shifts,
        employeeGroup,
        employeeDepartmentGroupId,
        employeeWorkType,
        employeeId: bestMatch.employeeCode,
        employeeBranchId: bestMatch.branchId?.toString(),
        employeeLocationId: location._id.toString(),
        employeeDepartmentId: bestMatch.departmentId?.toString(),
      });

      checkAction = "CHECK_OUT";
      earlyMins = payload.earlyMinutes;

      const matchedShift = shifts.find(
        (s) => s._id?.toString() === payload.shiftId?.toString() || s.code === payload.shiftId
      );
      currentShiftName = matchedShift ? matchedShift.name : "";

      await db.collection("time_records-timekeeping").updateOne(
        { _id: new ObjectId(latestRecord._id) },
        {
          $set: {
            clockOut: payload.clockOut,
            shiftId: payload.shiftId,
            ...(payload.lateMinutes !== undefined ? { lateMinutes: payload.lateMinutes } : {}),
            earlyMinutes: payload.earlyMinutes,
            updatedAt: now,
          }
        }
      );
    }

    // 7. PHẢN HỒI CLIENT
    let customMessage = `Check-in thành công tại ${location.locationName || locationSlug}. Chào ${bestMatch.fullName}!`;
    if (checkAction === "CHECK_OUT") {
      customMessage = `Check-out thành công. Tạm biệt ${bestMatch.fullName}!`;
    }

    if (lateMins > 0) {
      customMessage += ` (Bạn đi muộn ${lateMins} phút)`;
    } else if (earlyMins > 0) {
      customMessage += ` (Bạn về sớm ${earlyMins} phút)`;
    }

    return NextResponse.json(
      {
        data: {
          success: true,
          employeeCode: bestMatch.employeeCode,
          fullName: bestMatch.fullName,
          role: bestMatch.role || "Nhân viên",
          locationName: location.locationName || locationSlug,
          avatar: bestMatch.avatar || "User",
          euclideanDistance: faceMatch.minDistance,
          action: checkAction,
          lateMinutes: lateMins,
          earlyMinutes: earlyMins,
          shiftName: currentShiftName,
        },
        message: customMessage,
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("Lỗi Kiosk Check-in:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
