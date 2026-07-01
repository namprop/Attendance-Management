import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import { getCollection, addRow } from '@/app/lib/monggodb/mongoDBCRUD';
import { eventEmitter } from '@/app/lib/eventEmitter';
import {
  buildCheckInPayload,
  getEmployeeDepartmentGroupId,
  getEmployeeGroup,
  getEmployeeWorkType,
} from '@/app/lib/timekeeping/attendanceService';
import type { CheckInPayload } from '@/app/lib/timekeeping/attendanceService';
import type { ShiftConfig, TimeRecordTimekeeping } from '@/app/interface/timekeeping';

type ZkTecoWebhookBody = {
  employeeCode?: unknown;
  emp_id?: unknown;
  pin?: unknown;
  userid?: unknown;
  timeStr?: unknown;
  dateStr?: unknown;
  timestamp?: unknown;
  time?: unknown;
  deviceType?: unknown;
  locationId?: unknown;
} & Record<string, unknown>;

type EmployeeDocument = {
  employeeCode?: string;
  role?: string;
  employeeType?: string;
  departmentId?: string;
  deptGroupId?: string;
  locationId?: string;
  departmentName?: string;
  departmentGroupName?: string;
  locationName?: string;
  branchId?: string | ObjectId;
} & Record<string, unknown>;

type ShiftConfigDocument = ShiftConfig & Record<string, unknown>;

type TimeRecordDocument = Omit<TimeRecordTimekeeping, '_id'> & {
  _id: ObjectId | string;
} & Record<string, unknown>;

type NewTimeRecordDocument = Omit<CheckInPayload, 'action'> & {
  locationId: string | null;
  createdAt: Date;
  updatedAt: Date;
} & Record<string, unknown>;

const getStringValue = (value: unknown) => (
  typeof value === 'string' ? value.trim() : undefined
);

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'Lỗi server'
);

const getObjectId = (value: unknown) => {
  if (typeof value !== 'string' || !ObjectId.isValid(value)) return null;
  return new ObjectId(value);
};

const getStringField = (document: Record<string, unknown> | null, key: string) => {
  const value = document?.[key];
  return typeof value === 'string' ? value : '';
};

async function enrichEmployeeGroupFields(employee: EmployeeDocument): Promise<EmployeeDocument> {
  const departmentObjectId = getObjectId(employee.departmentId);
  const locationObjectId = getObjectId(employee.locationId);

  const [departmentCol, groupCol, locationCol] = await Promise.all([
    getCollection<Record<string, unknown>>('departments_timekeeping'),
    getCollection<Record<string, unknown>>('department_groups_timekeeping'),
    getCollection<Record<string, unknown>>('locations-timekeeping'),
  ]);

  const department = departmentObjectId
    ? await departmentCol.findOne({ _id: departmentObjectId } as Record<string, unknown>)
    : null;
  const groupId = employee.deptGroupId || getStringField(department, 'departmentGroupTimekeepingId');
  const groupObjectId = getObjectId(groupId);

  const [group, location] = await Promise.all([
    groupObjectId ? groupCol.findOne({ _id: groupObjectId } as Record<string, unknown>) : null,
    locationObjectId ? locationCol.findOne({ _id: locationObjectId } as Record<string, unknown>) : null,
  ]);

  return {
    ...employee,
    deptGroupId: groupId,
    departmentName: getStringField(department, 'name'),
    departmentGroupName: getStringField(group, 'name'),
    locationName: getStringField(location, 'locationName'),
  };
}

// === TASK 1.4: Cache enriched employee, TTL 60s — giảm N+5 DB queries/webhook ===
const _enrichCache = new Map<string, { data: EmployeeDocument; expiresAt: number }>();
const ENRICH_TTL_MS = 60_000;

async function enrichEmployeeGroupFieldsCached(employee: EmployeeDocument): Promise<EmployeeDocument> {
  const key = String(employee.employeeCode ?? '');
  const hit = _enrichCache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.data;
  const enriched = await enrichEmployeeGroupFields(employee);
  if (key) _enrichCache.set(key, { data: enriched, expiresAt: Date.now() + ENRICH_TTL_MS });
  return enriched;
}

export async function POST(req: Request) {
  try {
    // === TASK 1.3: Không dùng fallback hardcode — bắt buộc set env var ===
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key') || req.headers.get('token');
    const expectedToken = process.env.HARDWARE_WEBHOOK_SECRET;
    if (!expectedToken) {
      console.error('[❌ CONFIG] HARDWARE_WEBHOOK_SECRET chưa được cấu hình trong .env');
      return NextResponse.json({ success: false, message: 'Server misconfigured' }, { status: 500 });
    }

    if (authHeader?.replace('Bearer ', '') !== expectedToken) {
      return NextResponse.json({ success: false, message: 'Từ chối truy cập. Token không hợp lệ hoặc thiếu Token.' }, { status: 401 });
    }

    const body = (await req.json()) as ZkTecoWebhookBody;

    console.log('\n[📥 WEBHOOK NHẬN ĐƯỢC]:');
    console.log(JSON.stringify(body, null, 2));

    // 2. Linh hoạt đọc mã nhân viên từ nhiều định dạng máy chấm công khác nhau
    const employeeCode = getStringValue(body.employeeCode) || getStringValue(body.emp_id) || getStringValue(body.pin) || getStringValue(body.userid);

    // 3. Linh hoạt đọc ngày giờ
    let reqTimeStr = getStringValue(body.timeStr);
    let reqDateStr = getStringValue(body.dateStr);

    const fullTime = getStringValue(body.timestamp) || getStringValue(body.time);
    if (fullTime) {
      const parsedTime = dayjs(fullTime);
      if (parsedTime.isValid()) {
        if (!reqDateStr) reqDateStr = parsedTime.format('YYYY-MM-DD');
        if (!reqTimeStr) reqTimeStr = parsedTime.format('HH:mm:ss');
      } else if (fullTime.includes(' ')) {
        const parts = fullTime.split(' ');
        if (!reqDateStr) reqDateStr = parts[0];
        if (!reqTimeStr) reqTimeStr = parts[1];
      }
    }

    const deviceType = getStringValue(body.deviceType) || 'ZKTeco Hardware';
    const locationId = getStringValue(body.locationId) || null;

    console.log(`[🔍 PARSE KẾT QUẢ] employeeCode="${employeeCode}" | date="${reqDateStr}" | time="${reqTimeStr}" | fullTime="${fullTime}" | deviceType="${deviceType}"`);

    if (!employeeCode) {
      console.warn('[⚠️ WEBHOOK] Không tìm được employeeCode trong body! Các trường nhận được:', Object.keys(body).join(', '));
      return NextResponse.json({ success: false, message: 'Thiếu employeeCode' }, { status: 400 });
    }

    const now = dayjs();
    const dateStr = reqDateStr || now.format('YYYY-MM-DD');
    const timeStr = reqTimeStr || now.format('HH:mm:ss');

    const employeeCol = await getCollection<EmployeeDocument>('employees-timekeeping');
    const numericEmployeeCode = parseInt(employeeCode || '0');
    const paddedEmployeeCode = isNaN(numericEmployeeCode) ? '' : `NV${String(numericEmployeeCode).padStart(3, '0')}`;
    const mappedEnrollNumberStr = isNaN(numericEmployeeCode) ? '' : String(numericEmployeeCode + 1000);
    const mappedEnrollNumberNum = isNaN(numericEmployeeCode) ? 0 : numericEmployeeCode + 1000;

    const [employeeRaw, shifts, recordCol] = await Promise.all([
      employeeCol.findOne({
        $or: [
          { employeeCode: employeeCode },
          { enrollNumber: employeeCode },
          ...(isNaN(numericEmployeeCode) ? [] : [
            { enrollNumber: numericEmployeeCode },
            { enrollNumber: mappedEnrollNumberStr },
            { enrollNumber: mappedEnrollNumberNum },
            { employeeCode: paddedEmployeeCode }
          ])
        ]
      }),
      getCollection<ShiftConfigDocument>('shift_configs-timekeeping').then(col => col.find({ isActive: true }).toArray()),
      getCollection<TimeRecordDocument>('time_records-timekeeping'),
    ]);

    if (!employeeRaw) {
      console.log(`[Webhook ZKTeco] ⚠️ 404: Không tìm thấy nhân viên có mã = "${employeeCode}" trong DB.`);
      return NextResponse.json({ success: false, message: 'Không tìm thấy mã nhân viên', receivedCode: employeeCode }, { status: 404 });
    }

    // === TASK 1.1: Deduplication — bỏ qua record trùng khi mạng chập/retry ===
    const dedupeKey = `${employeeRaw.employeeCode ?? employeeCode}_${dateStr}_${timeStr}`;
    const duplicate = await recordCol.findOne({ dedupeKey });
    if (duplicate) {
      console.log(`[⚡ DEDUPE] Bỏ qua record trùng: ${dedupeKey}`);
      return NextResponse.json({ success: true, message: 'Record đã tồn tại, bỏ qua.', deduplicated: true });
    }

    // === TASK 1.5: Window dedup — ngăn double-push do TCP push + polling push cùng 1 lần quẹt ===
    // Connector có 2 luồng đẩy song song cho cùng 1 lần quẹt:
    //   1. getRealTimeLogs  → push ngay với recordTime "09:40:30"
    //   2. runPoll 2s sau   → getAttendances() trả attTime "09:41:00" (ZKTeco round lên phút)
    // Hai dedupeKey khác nhau → cả hai lọt qua → sinh 2 record.
    // Fix: nếu đã có record cùng nhân viên + cùng ngày + clockIn trong cửa sổ ±3 phút → bỏ qua.
    {
      const swipeMoment = dayjs(`${dateStr} ${timeStr}`);
      const windowStart = swipeMoment.subtract(1, 'minute').format('HH:mm:ss');
      const windowEnd   = swipeMoment.add(1, 'minute').format('HH:mm:ss');
      const empId = String(employeeRaw.employeeCode ?? employeeCode);
      const nearby = await recordCol.findOne({
        employeeId: empId,
        date: dateStr,
        clockIn: { $gte: windowStart, $lte: windowEnd },
      });
      if (nearby) {
        console.log(`[⚡ DEDUPE-WINDOW] Bỏ qua: ${empId} đã có record lúc ${(nearby as Record<string,unknown>).clockIn} (cửa sổ ±3 phút quanh ${timeStr})`);
        return NextResponse.json({ success: true, message: 'Record trong cửa sổ 3 phút, bỏ qua.', deduplicated: true });
      }
    }

    // === Auto clock-out: nếu đã có record hôm nay chưa ra và cách > 30 phút → ghi giờ ra ===
    // Lần quẹt đầu tiên = vào. Lần quẹt tiếp theo (sau 30 phút) = ra.
    {
      const empId = String(employeeRaw.employeeCode ?? employeeCode);
      const checkoutBefore = dayjs(`${dateStr} ${timeStr}`).subtract(5, 'minute').format('HH:mm:ss');
      const openRecord = await recordCol.findOne(
        { employeeId: empId, date: dateStr, clockOut: null, clockIn: { $lte: checkoutBefore } },
        { sort: { clockIn: 1 } }
      );
      if (openRecord) {
        await recordCol.updateOne({ _id: openRecord._id }, { $set: { clockOut: timeStr } });
        console.log(`[⏱️ CLOCK-OUT] ${empId}: clockIn=${(openRecord as Record<string,unknown>).clockIn} → clockOut=${timeStr}`);
        return NextResponse.json({ success: true, message: 'Đã ghi nhận giờ ra.', clockOut: timeStr });
      }
    }

    // === TASK 1.4: Dùng cache — tránh 5 DB queries/webhook khi hit ===
    const employeeWithGroupFields = await enrichEmployeeGroupFieldsCached(employeeRaw);

    const employeeGroup = getEmployeeGroup(employeeWithGroupFields);
    const employeeDepartmentGroupId = getEmployeeDepartmentGroupId(employeeWithGroupFields);
    const employeeWorkType = getEmployeeWorkType(employeeWithGroupFields);

    // Tạo record mới = lần vào đầu tiên của session này
    const payload: CheckInPayload = buildCheckInPayload({
      employeeId: employeeRaw.employeeCode ?? employeeCode!,
      date: dateStr,
      timeStr,
      deviceType: deviceType,
      shifts,
      employeeGroup,
      employeeDepartmentGroupId,
      employeeWorkType,
      employeeBranchId: employeeRaw.branchId?.toString(),
      employeeLocationId: locationId || employeeRaw.locationId?.toString(),
      employeeDepartmentId: employeeRaw.departmentId?.toString(),
    });

    const newDoc: NewTimeRecordDocument = {
      employeeId: payload.employeeId,
      date: payload.date,
      clockIn: payload.clockIn,
      clockOut: payload.clockOut,
      shiftId: payload.shiftId,
      deviceType: payload.deviceType,
      gpsMatched: payload.gpsMatched,
      lateMinutes: payload.lateMinutes,
      earlyMinutes: payload.earlyMinutes,
      reasonApproved: payload.reasonApproved,
      locationId: locationId,
      dedupeKey,
      lateReason: '',
      lateReasonApproved: false,
      earlyReasonApproved: false,
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await addRow<NewTimeRecordDocument>('time_records-timekeeping', newDoc);

    eventEmitter.emit('new_time_record', {
      employeeName: getStringField(employeeRaw, 'employeeName') || getStringField(employeeRaw, 'fullName') || 'Thành viên',
      employeeCode: employeeCode,
      timeStr: timeStr,
      deviceType: payload.deviceType,
      isCheckIn: true
    });

    return NextResponse.json({
      success: true,
      message: 'Nhận ZKTeco log thành công!',
      data: payload,
    });
  } catch (error: unknown) {
    console.error('Lỗi Webhook ZKTeco:', error);
    return NextResponse.json({ success: false, message: getErrorMessage(error) }, { status: 500 });
  }
}
