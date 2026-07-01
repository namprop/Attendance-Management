import type {
  AttendanceRequest,
  AttendanceRequestStatus,
  AttendanceRequestType,
  CheckInLog,
  Employee,
  LeaveRequest,
  OvertimeRequest,
  ShiftConfig,
  TimeRecordTimekeeping,
} from '@/app/interface/timekeeping';

export type StatisticsPeriod = 'week' | 'month' | 'year';

export interface DateRange {
  from: string;
  to: string;
}

export interface WeekOption extends DateRange {
  id: string;
  label: string;
}

export interface EmployeeStat {
  employee: Employee;
  actualDays: number;
  lateCount: number;
  totalLateMinutes: number;
  earlyCount: number;
  leaveDays: number;
  checkInRate: number;
  logs: CheckInLog[];
}

export interface EmployeeStatsTableRow {
  id: string;
  empCode: string;
  empName: string;
  rawDate: string;
  isSunday: boolean;
  isAbsent: boolean;
  leaveDayStatus: 'approved' | 'pending' | 'unexcused' | null;
  leaveDayLabel: string;
  attendanceRequestStatus: 'approved' | 'pending' | 'rejected' | 'expired' | null;
  attendanceRequestLabel: string;
  attendanceRequestType: AttendanceRequestType | null;
  deviceType: CheckInLog['deviceType'] | '';
  date: string;
  dayOfWeek: string;
  checkIn: string;
  checkOut: string;
  shift: string;
  late: number;
  early: number;
  actualHours: number;
  workMinutes: number;
  hours: number;
  workDay: number | string;
  isFullTime: boolean;
  kh: string;
  hoursPlus: number;
  workDayPlus: number;
  khPlus: string;
  tc1: number;
  tc2: number;
  tc3: number;
  total: number | string;
  overtimeStart?: string;
  overtimeEnd?: string;
  overtimeType?: string;
  overtimeWorkMode?: string;
}

interface BuildEmployeeStatsParams {
  employees: Employee[];
  logs: CheckInLog[];
  leaveRequests: LeaveRequest[];
  expectedDays: number;
  period: StatisticsPeriod;
  selectedMonth: string;
  selectedYear: string;
  activeWeek: WeekOption;
  customDateRange?: DateRange | null;
  onlyEmployeesWithLogs?: boolean;
  skipDateFilter?: boolean;
}

const WEEKDAY_LABELS = ['CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];

const parseDateValue = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const enumerateDateRange = (range: DateRange) => {
  const dates: string[] = [];
  const current = parseDateValue(range.from);
  const end = parseDateValue(range.to);

  while (current <= end) {
    dates.push(formatDateValue(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const getCheckInLogDeviceType = (deviceType: string | undefined) => {
  const normalized = String(deviceType || '').trim();
  return normalized || 'Web';
};

const LATE_DEDUCTION_THRESHOLD_MINUTES = 30;
const EARLY_DEDUCTION_THRESHOLD_MINUTES = 10;
const EMPTY_ATTENDANCE_TIMES = new Set(['', '-', '--', '---', '--:--', '--:--:--', 'null', 'undefined']);

const roundHours = (value: number) => Math.round(value * 100) / 100;
const roundWorkDay = (value: number) => Math.round(value * 100000) / 100000;

const normalizeAttendanceTime = (time: string | null | undefined) => {
  const value = String(time ?? '').trim();
  if (EMPTY_ATTENDANCE_TIMES.has(value.toLowerCase())) return null;
  return value;
};

const getCutoffDateTime = (date: string, shift?: ShiftConfig) => {
  const cutoffTime = normalizeAttendanceTime(shift?.validCheckOutEnd)
    || normalizeAttendanceTime(shift?.endTime)
    || '23:59';
  const cutoffMinutes = timeToMinutes(cutoffTime) ?? (23 * 60 + 59);
  const cutoffDate = parseDateValue(date);
  const crossDayCount = Number(shift?.crossDayCount || 0);

  cutoffDate.setDate(cutoffDate.getDate() + (Number.isFinite(crossDayCount) ? crossDayCount : 0));
  cutoffDate.setHours(Math.floor(cutoffMinutes / 60), cutoffMinutes % 60, 0, 0);

  return cutoffDate;
};

const canFinalizeAttendanceDate = (date: string, shift?: ShiftConfig, now = new Date()) => {
  const today = formatDateValue(now);
  if (date > today) return false;
  if (date < today) return true;
  return now >= getCutoffDateTime(date, shift);
};

const timeToMinutes = (time: string | null | undefined) => {
  if (!time) return null;
  const [hour, minute] = time.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

const normalizeShiftKey = (value: unknown) => String(value || '').trim();
const normalizeShiftCode = (value: unknown) => normalizeShiftKey(value).toLowerCase();

const getEmployeeShiftKeys = (employee: Employee) => (
  [employee.employeeCode, employee.id, employee._id, employee.enrollNumber]
    .map((value) => normalizeShiftCode(value))
    .filter(Boolean)
);

const getAssignedEmployeeKeys = (shift: ShiftConfig) => (
  (shift.assignedEmployeeCodes || [])
    .map((value) => normalizeShiftCode(value))
    .filter(Boolean)
);

const isShiftAssignedToEmployee = (shift: ShiftConfig, employee: Employee) => {
  const assignedEmployeeKeys = getAssignedEmployeeKeys(shift);
  if (assignedEmployeeKeys.length === 0) return false;
  const employeeKeys = getEmployeeShiftKeys(employee);
  return employeeKeys.some((key) => assignedEmployeeKeys.includes(key));
};

const isShiftAvailableForEmployee = (shift: ShiftConfig, employee: Employee) => {
  const assignedEmployeeKeys = getAssignedEmployeeKeys(shift);
  return assignedEmployeeKeys.length === 0 || isShiftAssignedToEmployee(shift, employee);
};

const findAssignedShiftForEmployee = (shifts: ShiftConfig[], employee: Employee) => (
  shifts.find((shift) => shift.isActive !== false && isShiftAssignedToEmployee(shift, employee))
);

const findShiftById = (shiftId: unknown, shifts: ShiftConfig[], employee?: Employee) => {
  const normalizedShiftId = normalizeShiftKey(shiftId);
  if (!normalizedShiftId) return undefined;

  const shiftByStableId = shifts.find((shift) => (
    normalizeShiftKey(shift._id) === normalizedShiftId ||
    normalizeShiftKey(shift.id) === normalizedShiftId
  ));

  if (shiftByStableId) {
    return !employee || isShiftAvailableForEmployee(shiftByStableId, employee)
      ? shiftByStableId
      : undefined;
  }

  const normalizedShiftCode = normalizeShiftCode(shiftId);
  const shiftByCode = shifts.find((shift) => normalizeShiftCode(shift.code) === normalizedShiftCode);
  return shiftByCode && (!employee || isShiftAvailableForEmployee(shiftByCode, employee))
    ? shiftByCode
    : undefined;
};

const roundEarlyClockOutToQuarter = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  if (minute < 10) return hour * 60;
  if (minute < 20) return hour * 60 + 15;
  if (minute < 35) return hour * 60 + 30;
  if (minute < 50) return hour * 60 + 45;
  return (hour + 1) * 60;
};

const roundLateDeductionToQuarter = (minutes: number) => Math.ceil(minutes / 15) * 15;

const getConfiguredShiftMinutes = (shift?: ShiftConfig) => {
  const totalMinutes = Number(shift?.totalMinutes);
  return Number.isFinite(totalMinutes) && totalMinutes > 0 ? totalMinutes : null;
};

const getConfiguredShiftWorkUnit = (shift?: ShiftConfig) => {
  const workUnit = Number(shift?.workUnit);
  return Number.isFinite(workUnit) && workUnit > 0 ? workUnit : null;
};

const calculateWorkMinutes = (clockIn: string | null, clockOut: string | null, shift?: ShiftConfig) => {
  const inMinutes = timeToMinutes(clockIn);
  const outMinutes = timeToMinutes(clockOut);
  if (inMinutes === null || outMinutes === null) return 0;

  const shiftStart = timeToMinutes(shift?.startTime);
  const shiftEnd = timeToMinutes(shift?.endTime);
  const lateMinutes = shiftStart === null ? 0 : Math.max(0, inMinutes - shiftStart);
  const effectiveInMinutes = shiftStart === null
    ? inMinutes
    : lateMinutes < LATE_DEDUCTION_THRESHOLD_MINUTES
      ? shiftStart
      : shiftStart + roundLateDeductionToQuarter(lateMinutes);
  const normalizedOutMinutes = outMinutes < inMinutes ? outMinutes + 24 * 60 : outMinutes;
  const normalizedShiftEnd = shiftEnd !== null && shiftStart !== null && shiftEnd < shiftStart ? shiftEnd + 24 * 60 : shiftEnd;
  const earlyMinutes = normalizedShiftEnd === null ? 0 : Math.max(0, normalizedShiftEnd - normalizedOutMinutes);
  const effectiveOutMinutes = normalizedShiftEnd === null
    ? normalizedOutMinutes
    : earlyMinutes > 0 && earlyMinutes < EARLY_DEDUCTION_THRESHOLD_MINUTES
      ? normalizedShiftEnd
      : earlyMinutes >= EARLY_DEDUCTION_THRESHOLD_MINUTES
        ? roundEarlyClockOutToQuarter(normalizedOutMinutes)
        : Math.min(normalizedOutMinutes, normalizedShiftEnd);

  let totalMinutes = effectiveOutMinutes - effectiveInMinutes;

  if (shift && shift.breakStartTime && shift.breakEndTime) {
    const breakStart = timeToMinutes(shift.breakStartTime);
    const breakEnd = timeToMinutes(shift.breakEndTime);
    if (breakStart !== null && breakEnd !== null && breakEnd > breakStart) {
      const overlapStart = Math.max(effectiveInMinutes, breakStart);
      const overlapEnd = Math.min(effectiveOutMinutes, breakEnd);
      if (overlapEnd > overlapStart) {
        totalMinutes -= (overlapEnd - overlapStart);
      }
    }
  }

  let workMinutes = Math.max(0, totalMinutes);
  
  const shiftExpectedMinutes = getConfiguredShiftMinutes(shift);
  if (shiftExpectedMinutes !== null) {
    workMinutes = Math.min(workMinutes, shiftExpectedMinutes);
  } else if (shift && (shift.name?.toLowerCase().includes('hành chính') || shift.code === 'HC')) {
    workMinutes = Math.min(workMinutes, 8 * 60);
  }

  return workMinutes;
};

const subtractBreakMinutes = (totalMinutes: number, inMinutes: number, outMinutes: number, shift?: ShiftConfig) => {
  const breakStart = timeToMinutes(shift?.breakStartTime);
  const breakEnd = timeToMinutes(shift?.breakEndTime);
  if (breakStart !== null && breakEnd !== null && breakEnd > breakStart) {
    const overlapStart = Math.max(inMinutes, breakStart);
    const overlapEnd = Math.min(outMinutes, breakEnd);
    if (overlapEnd > overlapStart) totalMinutes -= (overlapEnd - overlapStart);
  }

  return totalMinutes;
};

const calculateActualHours = (clockIn: string | null, clockOut: string | null, shift?: ShiftConfig) => {
  const inMinutes = timeToMinutes(clockIn);
  const outMinutes = timeToMinutes(clockOut);
  if (inMinutes === null || outMinutes === null) return 0;

  const normalizedOutMinutes = outMinutes < inMinutes ? outMinutes + 24 * 60 : outMinutes;
  const totalMinutes = subtractBreakMinutes(normalizedOutMinutes - inMinutes, inMinutes, normalizedOutMinutes, shift);

  return roundHours(Math.max(0, totalMinutes) / 60);
};

const calculateLateMinutesByShift = (clockIn: string | null | undefined, shift?: ShiftConfig) => {
  if (!clockIn || !shift?.startTime) return 0;
  const actualIn = timeToMinutes(clockIn);
  const shiftStart = timeToMinutes(shift.startTime);
  if (actualIn === null || shiftStart === null) return 0;
  return Math.max(0, actualIn - shiftStart);
};

const calculateEarlyMinutesByShift = (clockOut: string | null | undefined, shift?: ShiftConfig) => {
  if (!clockOut || !shift?.endTime) return 0;
  const actualOut = timeToMinutes(clockOut);
  const shiftEnd = timeToMinutes(shift.endTime);
  if (actualOut === null || shiftEnd === null) return 0;
  return Math.max(0, shiftEnd - actualOut);
};

const isFullTimeEmployee = (employee: Employee) => {
  const employeeType = String(employee.employeeType || '').toLowerCase();
  const role = String(employee.role || '').toLowerCase();
  return employeeType === 'full_time' || employeeType === 'full time' || role === 'fulltime' || role === 'full time';
};

const calculateWorkDay = (employee: Employee, workMinutes: number, workHours: number, shift?: ShiftConfig) => {
  if (workMinutes <= 0) return 0;
  if (!isFullTimeEmployee(employee)) return workHours;

  const shiftExpectedMinutes = getConfiguredShiftMinutes(shift);
  const shiftWorkUnit = getConfiguredShiftWorkUnit(shift);
  if (shiftExpectedMinutes !== null && shiftWorkUnit !== null) {
    return roundWorkDay((Math.min(workMinutes, shiftExpectedMinutes) / shiftExpectedMinutes) * shiftWorkUnit);
  }

  return Math.min(workHours / 8, 1);
};

export function formatDisplayDate(date: string) {
  return date.split('-').reverse().join('/');
}

export function getEmployeeCode(employee: Employee) {
  return employee.employeeCode || employee.id;
}

export function isLogOfEmployee(log: CheckInLog, employee: Employee) {
  const logEmpCode = (log as any).employeeCode || log.employeeId;
  return log.employeeId === employee.id || 
         log.employeeId === employee.employeeCode ||
         (employee._id && log.employeeId === String(employee._id)) ||
         logEmpCode === employee.id ||
         logEmpCode === employee.employeeCode ||
         (employee._id && logEmpCode === String(employee._id));
}

export interface EmployeeFilterParams {
  selectedBranches?: string[];
  selectedDepartments?: string[];
  selectedLocations?: string[];
  selectedBranch?: string;
  selectedDepartment?: string;
  selectedLocation?: string;
  searchMode?: string;
  appliedSearch?: string;
  page?: number;
  limit?: number;
  fetchCodes?: boolean;
}

const toFilterValues = (values?: string[] | string) => {
  if (Array.isArray(values)) return values.filter(Boolean);
  return values ? [values] : [];
};

const includesValue = (filters: string[], value?: string) => (
  Boolean(value && filters.includes(value))
);

export async function fetchEmployeesWithFilters(params: EmployeeFilterParams) {
  const query = new URLSearchParams();
  
  const branchFilters = toFilterValues(params.selectedBranches || params.selectedBranch);
  branchFilters.forEach(v => query.append('branchIds', v));
  
  const deptFilters = toFilterValues(params.selectedDepartments || params.selectedDepartment);
  deptFilters.forEach(v => query.append('departmentIds', v));
  
  const locFilters = toFilterValues(params.selectedLocations || params.selectedLocation);
  locFilters.forEach(v => query.append('locationIds', v));
  
  const q = (params.appliedSearch || '').trim();
  if (q) {
    query.append('search', q);
    if (params.searchMode) {
      query.append('searchMode', params.searchMode);
    }
  }

  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.fetchCodes) query.append('fetchCodes', 'true');
  
  try {
    const res = await fetch(`/api/v1/employees?${query.toString()}`);
    if (!res.ok) return params.fetchCodes ? [] : { data: [], total: 0 };
    const json = await res.json();
    return params.fetchCodes ? (json.data || []) : { data: json.data || [], total: json.total || 0 };
  } catch (error) {
    console.error('Failed to fetch employees with filters:', error);
    return params.fetchCodes ? [] : { data: [], total: 0 };
  }
}

interface FilterableEmployee {
  branchId?: string;
  branchTimekeeping?: string;
  departmentId?: string;
  department?: string;
  locationId?: string;
  employeeName?: string;
  employeeCode?: string;
  attendanceCode?: string;
}

export function filterEmployeesStats(
  employees: FilterableEmployee[],
  params: EmployeeFilterParams
) {
  const q = (params.appliedSearch || '').trim().toLowerCase();
  const branchFilters = toFilterValues(params.selectedBranches || params.selectedBranch);
  const departmentFilters = toFilterValues(params.selectedDepartments || params.selectedDepartment);
  const locationFilters = toFilterValues(params.selectedLocations || params.selectedLocation);
  
  return employees.filter((emp) => {
    const branchMatch = branchFilters.length > 0
      ? includesValue(branchFilters, emp.branchId) || includesValue(branchFilters, emp.branchTimekeeping)
      : true;
    const deptMatch = departmentFilters.length > 0
      ? includesValue(departmentFilters, emp.departmentId) || includesValue(departmentFilters, emp.department)
      : true;
    const locationMatch = locationFilters.length > 0
      ? includesValue(locationFilters, emp.locationId)
      : true;
      
    let searchMatch = true;
    if (q) {
      if (params.searchMode === 'fullName') {
        searchMatch = (emp.employeeName || '').toLowerCase().includes(q);
      } else if (params.searchMode === 'all') {
        searchMatch = [
          emp.employeeCode,
          emp.employeeName,
          emp.attendanceCode,
        ].some((value) => String(value || '').toLowerCase().includes(q));
      } else {
        // Default: employeeCode
        searchMatch = (emp.employeeCode || '').toLowerCase().includes(q);
      }
    }
      
    return branchMatch && deptMatch && locationMatch && searchMatch;
  });
}

export function mapTimeRecordToCheckInLog(record: TimeRecordTimekeeping): CheckInLog {
  const id = typeof record._id === 'string' ? record._id : `${record.employeeId}-${record.date}-${record.clockIn || ''}`;

  return {
    id,
    employeeId: record.employeeId,
    date: record.date,
    clockIn: normalizeAttendanceTime(record.clockIn),
    clockOut: normalizeAttendanceTime(record.clockOut),
    lateMinutes: record.lateMinutes || 0,
    earlyMinutes: record.earlyMinutes || 0,
    shiftId: record.shiftId || '',
    gpsMatched: record.gpsMatched,
    deviceType: getCheckInLogDeviceType(record.deviceType),
    lateReason: record.lateReason,
    reasonApproved: record.reasonApproved,
  };
}

export function mapTimeRecordsToCheckInLogs(records: TimeRecordTimekeeping[]) {
  return records.map(mapTimeRecordToCheckInLog);
}

export function isDateInStatsPeriod(
  date: string,
  {
    period,
    selectedMonth,
    selectedYear,
    activeWeek,
    customDateRange,
    skipDateFilter,
  }: {
    period: StatisticsPeriod;
    selectedMonth: string;
    selectedYear: string;
    activeWeek: WeekOption;
    customDateRange?: DateRange | null;
    skipDateFilter?: boolean;
  },
) {
  if (skipDateFilter) return true;
  if (customDateRange) return date >= customDateRange.from && date <= customDateRange.to;
  if (period === 'week') return date >= activeWeek.from && date <= activeWeek.to;
  if (period === 'month') return date.startsWith(selectedMonth);
  return date.startsWith(selectedYear);
}

export function countLeaveDays(leaveRequests: LeaveRequest[]) {
  return leaveRequests.reduce((acc, curr) => {
    const start = new Date(curr.startDate);
    const end = new Date(curr.endDate);
    return acc + Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, 0);
}

export function calculateEmployeePeriodStats(
  employee: Employee,
  params: Omit<BuildEmployeeStatsParams, 'employees' | 'onlyEmployeesWithLogs'>,
): Omit<EmployeeStat, 'employee'> {
  const { logs, leaveRequests, expectedDays } = params;

  const empLogs = logs.filter((log) => (
    isLogOfEmployee(log, employee) &&
    isDateInStatsPeriod(log.date, params)
  ));

  const adjustedLogs = empLogs.map((log) => {
    let lateMinutes = log.lateMinutes;
    let earlyMinutes = log.earlyMinutes;

    const approvedLate = findLeaveRequestForDate(employee, log.date, leaveRequests, 'arrive_late');
    if (approvedLate && approvedLate.status === 'approved') {
      const allowedLateMinutes = approvedLate.requestedMinutes ?? lateMinutes;
      if (lateMinutes <= allowedLateMinutes) lateMinutes = 0;
    }

    const approvedEarly = findLeaveRequestForDate(employee, log.date, leaveRequests, 'leave_early');
    if (approvedEarly && approvedEarly.status === 'approved') {
      const allowedEarlyMinutes = approvedEarly.requestedMinutes ?? earlyMinutes;
      if (earlyMinutes <= allowedEarlyMinutes) earlyMinutes = 0;
    }

    return {
      ...log,
      lateMinutes,
      earlyMinutes,
    };
  });

  const lateLogs = adjustedLogs.filter((log) => log.lateMinutes > 0);
  const approvedLeaves = leaveRequests.filter((request) => (
    isLogOfEmployee({ employeeId: request.employeeId } as CheckInLog, employee) &&
    request.status === 'approved' &&
    isDateInStatsPeriod(request.startDate, params)
  ));

  const actualDays = new Set(empLogs.map((log) => log.date)).size;
  const lateCount = lateLogs.length;
  const totalLateMinutes = lateLogs.reduce((sum, log) => sum + log.lateMinutes, 0);
  const earlyCount = adjustedLogs.filter((log) => log.earlyMinutes > 0).length;
  const leaveDays = countLeaveDays(approvedLeaves);
  const checkInRate = expectedDays > 0 ? Math.min(100, Math.round((actualDays / expectedDays) * 100)) : 0;

  return {
    actualDays,
    lateCount,
    totalLateMinutes,
    earlyCount,
    leaveDays,
    checkInRate,
    logs: empLogs,
  };
}

export function buildEmployeeStats(params: BuildEmployeeStatsParams): EmployeeStat[] {
  const stats = params.employees.map((employee) => ({
    employee,
    ...calculateEmployeePeriodStats(employee, params),
  }));

  return params.onlyEmployeesWithLogs
    ? stats.filter((stat) => stat.logs.length > 0)
    : stats;
}

const getShiftLabel = (shiftId: string, shifts: ShiftConfig[], employee?: Employee) => {
  if (!shiftId) return '';
  const shift = findShiftById(shiftId, shifts, employee);
  if (!shift) return employee ? '' : shiftId;
  return shift.name || shift.code || shiftId;
};

const findLeaveRequestForDate = (
  employee: Employee,
  date: string,
  leaveRequests: LeaveRequest[] = [],
  type?: string,
) => leaveRequests.find((request) => (
  isLogOfEmployee({ employeeId: request.employeeId } as CheckInLog, employee) &&
  (!type || request.type === type) &&
  request.startDate <= date &&
  request.endDate >= date
));

const getLeaveDayStatus = (
  employee: Employee,
  date: string,
  hasCheckIn: boolean,
  isSunday: boolean,
  leaveRequests: LeaveRequest[] = [],
): EmployeeStatsTableRow['leaveDayStatus'] => {
  if (hasCheckIn || isSunday) return null;

  const leaveRequest = findLeaveRequestForDate(employee, date, leaveRequests);
  if (!leaveRequest) return 'unexcused';
  if (leaveRequest.status === 'approved') return 'approved';
  if (leaveRequest.status === 'pending') return 'pending';
  return 'unexcused';
};

const getLeaveDayLabel = (status: EmployeeStatsTableRow['leaveDayStatus']) => {
  if (status === 'approved') return 'Nghỉ có phép';
  if (status === 'pending') return 'Chờ duyệt';
  if (status === 'unexcused') return 'Nghỉ không phép';
  return '';
};

const findAttendanceRequestForDate = (
  employee: Employee,
  date: string,
  requestType: AttendanceRequestType,
  attendanceRequests: AttendanceRequest[] = [],
) => attendanceRequests.find((request) => (
  (
    isLogOfEmployee({ employeeId: request.employeeId } as CheckInLog, employee) ||
    Boolean(request.employeeCode && request.employeeCode === getEmployeeCode(employee))
  ) &&
  request.date === date &&
  request.requestType === requestType
));

const getAttendanceRequestType = (
  clockIn: string | null,
  clockOut: string | null,
): AttendanceRequestType | null => {
  if (!clockIn && clockOut) return 'forgot_checkin';
  if (clockIn && !clockOut) return 'forgot_checkout';
  return null;
};

const normalizeAttendanceRequestStatus = (
  status?: AttendanceRequestStatus,
): EmployeeStatsTableRow['attendanceRequestStatus'] => {
  if (status === 'Approved') return 'approved';
  if (status === 'Rejected') return 'rejected';
  if (status === 'Expired') return 'expired';
  return 'pending';
};

const getAttendanceRequestLabel = (
  requestType: AttendanceRequestType | null,
  status: EmployeeStatsTableRow['attendanceRequestStatus'],
) => {
  if (!requestType || !status) return '';

  const typeLabel = requestType === 'forgot_checkin' ? 'Quên chấm công' : 'Quên kết công';
  if (status === 'approved') return `${typeLabel} - Đã duyệt`;
  if (status === 'rejected') return `${typeLabel} - Từ chối`;
  if (status === 'expired') return `${typeLabel} - Hết hạn`;
  return typeLabel;
};

/** Tìm đơn tăng ca approved cho nhân viên vào ngày cụ thể */
const findApprovedOvertimeForDate = (
  employee: Employee,
  date: string,
  overtimeRequests: OvertimeRequest[] = [],
): OvertimeRequest | undefined => overtimeRequests.find((req) =>
  req.status === 'approved' &&
  req.date === date &&
  (
    req.employeeId === employee.id ||
    req.employeeId === employee.employeeCode ||
    (employee._id && req.employeeId === String(employee._id)) ||
    (req.employeeCode && req.employeeCode === employee.employeeCode)
  ),
);

/** Tính số giờ tăng ca dựa trên check-out thực tế và khung giờ đã duyệt */
const calculateOvertimeHours = (
  clockOut: string | null,
  shiftEndTime: string | undefined,
  approvedOT: OvertimeRequest | undefined,
): number => {
  if (!approvedOT || !clockOut) return 0;

  const otStart = approvedOT.overtimeStart;
  const otEnd   = approvedOT.overtimeEnd;

  const effectiveStart = shiftEndTime && timeToMinutes(shiftEndTime) !== null
    ? Math.max(timeToMinutes(otStart) ?? 0, timeToMinutes(shiftEndTime) ?? 0)
    : timeToMinutes(otStart) ?? 0;

  const clockOutMins  = timeToMinutes(clockOut) ?? 0;
  const otEndMins     = timeToMinutes(otEnd) ?? 0;
  const actualEndMins = Math.min(clockOutMins, otEndMins);
  const otMins        = Math.max(0, actualEndMins - effectiveStart);

  return roundHours(otMins / 60);
};

export function buildEmployeeStatsRows(
  employeesStats: EmployeeStat[],
  shifts: ShiftConfig[] = [],
  dateRange?: DateRange | null,
  leaveRequests: LeaveRequest[] = [],
  attendanceRequests: AttendanceRequest[] = [],
  overtimeRequests: OvertimeRequest[] = [],
): EmployeeStatsTableRow[] {
  const rangeDates = dateRange ? enumerateDateRange(dateRange).reverse() : null;

  const buildRow = (stat: EmployeeStat, rowDate: string, log: CheckInLog | null, index = 0): EmployeeStatsTableRow => {
    const date = parseDateValue(rowDate);
    const rawClockIn = normalizeAttendanceTime(log?.clockIn);
    const rawClockOut = normalizeAttendanceTime(log?.clockOut);
    const hasAnyAttendance = Boolean(rawClockIn || rawClockOut);
    const shiftId = log?.shiftId || '';
    const assignedShift = findAssignedShiftForEmployee(shifts, stat.employee);
    const shift = assignedShift || findShiftById(shiftId, shifts, stat.employee);
    const isAttendanceFinalized = canFinalizeAttendanceDate(rowDate, shift);
    const attendanceRequestType = isAttendanceFinalized ? getAttendanceRequestType(rawClockIn, rawClockOut) : null;
    const attendanceRequest = attendanceRequestType
      ? findAttendanceRequestForDate(stat.employee, rowDate, attendanceRequestType, attendanceRequests)
      : undefined;
    const attendanceRequestStatus = attendanceRequestType
      ? normalizeAttendanceRequestStatus(attendanceRequest?.status)
      : null;
    const isAttendanceRequestApproved = attendanceRequestStatus === 'approved';
    const effectiveClockIn = isAttendanceRequestApproved && attendanceRequestType === 'forgot_checkin'
      ? normalizeAttendanceTime(attendanceRequest?.requestedCheckIn) || normalizeAttendanceTime(shift?.startTime) || rawClockIn
      : rawClockIn;
    const effectiveClockOut = isAttendanceRequestApproved && attendanceRequestType === 'forgot_checkout'
      ? normalizeAttendanceTime(attendanceRequest?.requestedCheckOut) || normalizeAttendanceTime(shift?.endTime) || rawClockOut
      : rawClockOut;
    const actualHours = calculateActualHours(effectiveClockIn, effectiveClockOut, shift);
    const isSunday = date.getDay() === 0;
    const hasApprovedOvertime = Boolean(findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests));
    
    let workMinutes = calculateWorkMinutes(effectiveClockIn, effectiveClockOut, shift);
    // Nếu là Chủ Nhật: chấm công bình thường thì vẫn lên giờ làm việc theo ca (bất kể ca nào: HC, Ca Sáng, Ca Đêm...).
    // Nhưng nếu CÓ đơn xin tăng ca, thì toàn bộ thời gian ngày hôm đó CHỈ tính là Tăng ca (không tính vào giờ làm việc của bất kỳ ca nào).
    if (isSunday && hasApprovedOvertime) {
      workMinutes = 0;
    }

    const workHours = roundHours(workMinutes / 60);

    let lateMinutes = calculateLateMinutesByShift(effectiveClockIn, shift) || log?.lateMinutes || 0;
    const approvedLate = findLeaveRequestForDate(stat.employee, rowDate, leaveRequests, 'arrive_late');
    if (approvedLate && approvedLate.status === 'approved') {
      const allowedLateMinutes = approvedLate.requestedMinutes ?? lateMinutes;
      if (lateMinutes <= allowedLateMinutes) lateMinutes = 0;
    }

    let earlyMinutes = calculateEarlyMinutesByShift(effectiveClockOut, shift) || log?.earlyMinutes || 0;
    const approvedEarly = findLeaveRequestForDate(stat.employee, rowDate, leaveRequests, 'leave_early');
    if (approvedEarly && approvedEarly.status === 'approved') {
      const allowedEarlyMinutes = approvedEarly.requestedMinutes ?? earlyMinutes;
      if (earlyMinutes <= allowedEarlyMinutes) earlyMinutes = 0;
    }
    const workDay = calculateWorkDay(stat.employee, workMinutes, workHours, shift);
    const isFullTime = isFullTimeEmployee(stat.employee);
    const leaveDayStatus = attendanceRequestType
      ? null
      : isAttendanceFinalized
        ? getLeaveDayStatus(stat.employee, rowDate, hasAnyAttendance, isSunday, leaveRequests)
        : null;
    const isCredited = workMinutes > 0;

    return {
      id: `${getEmployeeCode(stat.employee)}-${rowDate}-${log?.id || `empty-${index}`}`,
      empCode: getEmployeeCode(stat.employee),
      empName: stat.employee.fullName || stat.employee.name,
      rawDate: rowDate,
      isSunday,
      isAbsent: isAttendanceFinalized && !hasAnyAttendance,
      leaveDayStatus,
      leaveDayLabel: getLeaveDayLabel(leaveDayStatus),
      attendanceRequestStatus,
      attendanceRequestLabel: getAttendanceRequestLabel(attendanceRequestType, attendanceRequestStatus),
      attendanceRequestType,
      deviceType: log?.deviceType || '',
      date: formatDisplayDate(rowDate),
      dayOfWeek: WEEKDAY_LABELS[date.getDay()],
      checkIn: rawClockIn ? rawClockIn.slice(0, 5) : '',
      checkOut: rawClockOut ? rawClockOut.slice(0, 5) : '',
      shift: assignedShift?.name || assignedShift?.code || getShiftLabel(shiftId, shifts, stat.employee) || (hasAnyAttendance ? 'HC' : '--'),
      late: lateMinutes,
      early: earlyMinutes,
      actualHours,
      workMinutes,
      hours: workHours,
      workDay,
      isFullTime,
      kh: isCredited ? (isFullTime ? 'X' : 'PT') : isAttendanceFinalized && !hasAnyAttendance ? 'V' : '',
      hoursPlus: (() => {
        const approvedOT = findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests);
        return roundHours(calculateOvertimeHours(effectiveClockOut, shift?.endTime, approvedOT));
      })(),
      overtimeStart: findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests)?.overtimeStart,
      overtimeEnd: findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests)?.overtimeEnd,
      overtimeType: findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests)?.overtimeType,
      overtimeWorkMode: findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests)?.workMode,
      workDayPlus: 0,
      khPlus: isCredited || hasAnyAttendance || !isAttendanceFinalized ? '' : 'V',
      tc1: (() => {
        const approvedOT = findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests);
        const otHours = roundHours(calculateOvertimeHours(effectiveClockOut, shift?.endTime, approvedOT));
        return approvedOT?.overtimeType === '1' ? otHours : 0;
      })(),
      tc2: (() => {
        const approvedOT = findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests);
        const otHours = roundHours(calculateOvertimeHours(effectiveClockOut, shift?.endTime, approvedOT));
        return approvedOT?.overtimeType === '2' ? otHours : 0;
      })(),
      tc3: (() => {
        const approvedOT = findApprovedOvertimeForDate(stat.employee, rowDate, overtimeRequests);
        const otHours = roundHours(calculateOvertimeHours(effectiveClockOut, shift?.endTime, approvedOT));
        return approvedOT?.overtimeType === '3' ? otHours : 0;
      })(),
      total: isFullTime ? workDay : workHours,
    };
  };

  if (!rangeDates) {
    return employeesStats.flatMap((stat) => (
      stat.logs.map((log, index) => buildRow(stat, log.date, log, index))
    ));
  }

  return employeesStats.flatMap((stat) => (
    rangeDates.flatMap((rowDate) => {
      const logs = stat.logs.filter((log) => log.date === rowDate);
      return logs.length > 0
        ? logs.map((log, index) => buildRow(stat, rowDate, log, index))
        : [buildRow(stat, rowDate, null)];
    })
  ));
}
