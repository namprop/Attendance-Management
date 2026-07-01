import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import { getCollection, addRow } from '@/app/lib/monggodb/mongoDBCRUD';
import {
  buildCheckInPayload,
  buildCheckOutPayload,
  getEmployeeDepartmentGroupId,
  getEmployeeGroup,
  getEmployeeWorkType,
} from '@/app/lib/timekeeping/attendanceService';
import type { CheckInPayload, CheckOutPayload } from '@/app/lib/timekeeping/attendanceService';
import type { ShiftConfig, TimeRecordTimekeeping } from '@/app/interface/timekeeping';

type FaceIdWebhookBody = {
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

export async function POST(req: Request) {
  try {
    // 1. Xác thực bảo mật Token
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key') || req.headers.get('token');
    const expectedToken = process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY';
    
    if (authHeader?.replace('Bearer ', '') !== expectedToken) {
      return NextResponse.json({ success: false, message: 'Từ chối truy cập. Token không hợp lệ hoặc thiếu Token.' }, { status: 401 });
    }

    const body = (await req.json()) as FaceIdWebhookBody;
    
    // 2. Linh hoạt đọc mã nhân viên từ nhiều định dạng máy chấm công khác nhau
    const employeeCode = getStringValue(body.employeeCode) || getStringValue(body.emp_id) || getStringValue(body.pin) || getStringValue(body.userid);
    
    // 3. Linh hoạt đọc ngày giờ
    let reqTimeStr = getStringValue(body.timeStr);
    let reqDateStr = getStringValue(body.dateStr);

    const fullTime = getStringValue(body.timestamp) || getStringValue(body.time);
    if (fullTime && fullTime.includes(' ')) {
      const parts = fullTime.split(' ');
      if (!reqDateStr) reqDateStr = parts[0];
      if (!reqTimeStr) reqTimeStr = parts[1];
    }
    
    // 4. Các thông tin cấu hình thêm từ máy
    const deviceType = getStringValue(body.deviceType) || 'Hardware';
    const locationId = getStringValue(body.locationId) || null;

    if (!employeeCode) {
      return NextResponse.json({ success: false, message: 'Thiếu employeeCode' }, { status: 400 });
    }

    const now = dayjs();
    const dateStr = reqDateStr || now.format('YYYY-MM-DD');
    const timeStr = reqTimeStr || now.format('HH:mm:ss');

    const employeeCol = await getCollection<EmployeeDocument>('employees-timekeeping');
    const employee = await employeeCol.findOne({ employeeCode });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy mã nhân viên' }, { status: 404 });
    }

    const employeeWithGroupFields = await enrichEmployeeGroupFields(employee);
    const employeeGroup = getEmployeeGroup(employeeWithGroupFields);
    const employeeDepartmentGroupId = getEmployeeDepartmentGroupId(employeeWithGroupFields);
    const employeeWorkType = getEmployeeWorkType(employeeWithGroupFields);

    const shiftCol = await getCollection<ShiftConfigDocument>('shift_configs-timekeeping');
    const shifts = await shiftCol.find({ isActive: true }).toArray();

    const recordCol = await getCollection<TimeRecordDocument>('time_records-timekeeping');
    const todayRecords = await recordCol.find({
      employeeId: employeeCode,
      date: dateStr,
    }).sort({ clockIn: -1 }).toArray();

    const latestRecord = todayRecords.length > 0 ? todayRecords[0] : null;
    const isCheckOut = Boolean(latestRecord?.clockIn && !latestRecord.clockOut);

    let payload: CheckInPayload | CheckOutPayload;

    if (!isCheckOut || !latestRecord) {
      payload = buildCheckInPayload({
        employeeId: employeeCode,
        date: dateStr,
        timeStr,
        deviceType: deviceType,
        shifts,
        employeeGroup,
        employeeDepartmentGroupId,
        employeeWorkType,
        employeeBranchId: employee.branchId?.toString(),
        employeeLocationId: locationId || employee.locationId?.toString(),
        employeeDepartmentId: employee.departmentId?.toString(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addRow<NewTimeRecordDocument>('time_records-timekeeping', newDoc);
    } else {
      payload = buildCheckOutPayload({
        recordId: latestRecord._id.toString(),
        timeStr,
        clockInTime: latestRecord.clockIn,
        existingShiftId: latestRecord.shiftId,
        shifts,
        employeeGroup,
        employeeDepartmentGroupId,
        employeeWorkType,
        employeeId: employeeCode,
        employeeBranchId: employee.branchId?.toString(),
        employeeLocationId: locationId || employee.locationId?.toString(),
        employeeDepartmentId: employee.departmentId?.toString(),
      });

      const updateFields = {
        clockOut: payload.clockOut,
        shiftId: payload.shiftId,
        ...(payload.lateMinutes !== undefined ? { lateMinutes: payload.lateMinutes } : {}),
        earlyMinutes: payload.earlyMinutes,
        updatedAt: new Date(),
      };
      const recordObjectId = typeof latestRecord._id === 'string'
        ? new ObjectId(latestRecord._id)
        : latestRecord._id;

      await recordCol.updateOne(
        { _id: recordObjectId },
        { $set: updateFields },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Nhận FaceID thành công!',
      data: payload,
    });
  } catch (error: unknown) {
    console.error('Lỗi Webhook FaceID:', error);
    return NextResponse.json({ success: false, message: getErrorMessage(error) }, { status: 500 });
  }
}
