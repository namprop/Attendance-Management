import dayjs from 'dayjs';
import fs from 'fs/promises';
import path from 'path';
import { ObjectId } from 'mongodb';
import type { Employee, LeaveRequest, ShiftConfig, TimeRecordTimekeeping } from '@/app/interface/timekeeping';
import { getAllRows, getCollection } from '@/app/lib/monggodb/mongoDBCRUD';
import {
  calculateEarlyMinutes,
  calculateLateMinutes,
  findShiftByIdentifier,
  getDefaultShiftForEmployee,
  getEmployeeDepartmentGroupId,
  getEmployeeGroup,
  getShiftIdentifier,
  type EmployeeWorkType,
} from '@/app/lib/timekeeping/attendanceService';
import {
  syncAttendanceRequestsFromRows,
  type AttendanceRequestSyncResult,
} from '@/app/lib/timekeeping/attendanceRequestsService';

const TIME_RECORDS_COLLECTION = 'time_records-timekeeping';
const EMPLOYEES_COLLECTION = 'employees-timekeeping';
const SHIFTS_COLLECTION = 'shift_configs-timekeeping';
const LEAVES_COLLECTION = 'leaves-timekeeping';

type SortOrder = 'asc' | 'desc';
type TimeRecordDocument = Omit<TimeRecordTimekeeping, '_id'> & {
  _id?: ObjectId | string;
} & Record<string, unknown>;

type TimeRecordSortOption = {
  field: keyof TimeRecordDocument;
  order?: SortOrder;
};

export type AttendanceSyntheticStatus =
  | 'pending_attendance'
  | 'pending_checkout'
  | 'missing_checkout'
  | 'missing_checkin'
  | 'leave_approved'
  | 'absent_unexcused'
  | 'no_shift';

export type TimeRecordsListRow = TimeRecordTimekeeping & {
  _id: string;
  employeeName?: string;
  employeeCode?: string;
  employeeTypeLabel?: string;
  employeeGroup?: string;
  shiftName?: string;
  shiftCode?: string;
  groupName?: string;
  departmentName?: string;
  locationName?: string;
  branchName?: string;
  rowStatus?: AttendanceSyntheticStatus | null;
  isSynthetic?: boolean;
  syntheticStatus?: AttendanceSyntheticStatus;
};

export interface TimeRecordsListParams {
  page: number;
  pageSize: number;
  skip?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  detailStartDate?: string;
  detailEndDate?: string;
  selectedBranchId?: string;
  selectedBranchIds?: string[];
  selectedLocationId?: string;
  selectedLocationIds?: string[];
  selectedGroupId?: string;
  selectedGroupIds?: string[];
  selectedDeptId?: string;
  selectedDeptIds?: string[];
  filters?: Record<string, unknown>;
  sort?: TimeRecordSortOption[];
}

export interface TimeRecordsListResult {
  data: TimeRecordsListRow[];
  detailRows: TimeRecordsListRow[];
  total: number;
  page: number;
  pageSize: number;
  attendanceRequestSync?: AttendanceRequestSyncResult | null;
}

const DEFAULT_SORT: TimeRecordSortOption[] = [
  { field: 'date', order: 'desc' },
  { field: 'clockIn', order: 'desc' },
  { field: 'createdAt', order: 'desc' },
  { field: '_id', order: 'desc' },
];

const EMPTY_ATTENDANCE_TIMES = new Set([
  '',
  '-',
  '--',
  '---',
  '--:--',
  '--:--:--',
  'null',
  'undefined',
]);

const normalizeTime = (time: string | null | undefined) => {
  const value = String(time || '').trim();
  if (!value) return '';
  const [hour = '', minute = ''] = value.split(':');
  if (!hour || !minute) return '';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

const normalizeAttendanceTime = (time: string | null | undefined): string | null => {
  const value = String(time || '').trim();
  if (EMPTY_ATTENDANCE_TIMES.has(value.toLowerCase())) return null;
  return value;
};

const getEmployeeCodeValue = (employee: Employee) => employee.employeeCode || employee.id;

const stringifyId = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return String(value);
  }
  return String(value);
};

const normalizeId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const record = value as { _id?: unknown; id?: unknown; toHexString?: () => string; toString?: () => string };
    if (typeof record.toHexString === 'function') return record.toHexString();
    if (record._id) return normalizeId(record._id);
    if (record.id) return normalizeId(record.id);
    if (typeof record.toString === 'function') {
      const stringValue = record.toString();
      return stringValue === '[object Object]' ? '' : stringValue;
    }
  }
  return String(value);
};

const normalizeSelectedIds = (values?: unknown[], fallback?: unknown) => {
  const list = Array.isArray(values) ? values : fallback ? [fallback] : [];
  return Array.from(new Set(list.map(normalizeId).filter(Boolean)));
};

const enumerateDates = (from: string, to: string) => {
  const dates: string[] = [];
  const current = dayjs(from);
  const end = dayjs(to);
  if (!current.isValid() || !end.isValid()) return dates;

  for (let cursor = current; cursor.isSame(end, 'day') || cursor.isBefore(end, 'day'); cursor = cursor.add(1, 'day')) {
    dates.push(cursor.format('YYYY-MM-DD'));
  }
  return dates;
};

const getEmployeeTypeLabel = (employee: Employee | undefined) => {
  if (!employee) return '---';
  const employeeType = String(employee.employeeType || '').toLowerCase();
  const role = String(employee.role || '').toLowerCase();
  const isFullTime = (
    employeeType === 'full_time' ||
    employeeType === 'full time' ||
    employeeType === 'fulltime' ||
    role === 'fulltime' ||
    role === 'full time'
  );
  return isFullTime ? 'Full time' : 'Part time';
};

const getEmployeeWorkType = (employee: Employee | undefined): EmployeeWorkType => (
  getEmployeeTypeLabel(employee) === 'Part time' ? 'PART_TIME' : 'FULL_TIME'
);

const findEmployee = (employees: Employee[], employeeId: string): Employee | undefined => (
  employees.find((employee) => employee.employeeCode === employeeId || employee.id === employeeId)
);

const getCutoffDateTime = (date: string, shift?: ShiftConfig) => {
  const cutoffTime = normalizeTime(shift?.validCheckOutEnd || shift?.endTime);
  if (!cutoffTime) return null;

  const cutoff = dayjs(`${date}T${cutoffTime}:00`);
  if (!cutoff.isValid()) return null;

  const crossDayCount = Number(shift?.crossDayCount || 0);
  return cutoff.add(Number.isFinite(crossDayCount) ? crossDayCount : 0, 'day');
};

const isAfterCutoff = (date: string, shift?: ShiftConfig) => {
  const cutoff = getCutoffDateTime(date, shift);
  return cutoff ? dayjs().isAfter(cutoff) : dayjs().isAfter(dayjs(date).endOf('day'));
};

const hasApprovedLeave = (employee: Employee, date: string, leaveRequests: LeaveRequest[]) => (
  leaveRequests.some((request) => {
    const requestEmployeeId = String(request.employeeId || '');
    const employeeMatches = requestEmployeeId === employee.id || requestEmployeeId === employee.employeeCode;
    if (!employeeMatches) return false;

    const status = String(request.status || '').toLowerCase();
    if (status !== 'approved') return false;

    return date >= request.startDate && date <= request.endDate;
  })
);

const employeeMatchesOrgFilters = (
  employee: Employee | undefined,
  params: Pick<
    TimeRecordsListParams,
    | 'selectedBranchId'
    | 'selectedBranchIds'
    | 'selectedLocationId'
    | 'selectedLocationIds'
    | 'selectedGroupId'
    | 'selectedGroupIds'
    | 'selectedDeptId'
    | 'selectedDeptIds'
  >,
) => {
  if (!employee) return false;
  const selectedBranchIds = normalizeSelectedIds(params.selectedBranchIds, params.selectedBranchId);
  const selectedLocationIds = normalizeSelectedIds(params.selectedLocationIds, params.selectedLocationId);
  const selectedGroupIds = normalizeSelectedIds(params.selectedGroupIds, params.selectedGroupId);
  const selectedDeptIds = normalizeSelectedIds(params.selectedDeptIds, params.selectedDeptId);

  if (selectedBranchIds.length > 0 && !selectedBranchIds.includes(normalizeId(employee.branchId))) return false;
  if (selectedLocationIds.length > 0 && !selectedLocationIds.includes(normalizeId(employee.locationId))) return false;
  if (selectedGroupIds.length > 0 && !selectedGroupIds.includes(normalizeId(employee.deptGroupId))) return false;
  if (selectedDeptIds.length > 0 && !selectedDeptIds.includes(normalizeId(employee.departmentId))) return false;
  return true;
};

const rowMatchesSearch = (
  row: TimeRecordsListRow,
  employee: Employee | undefined,
  search?: string,
) => {
  if (!search?.trim()) return true;
  const keyword = search.trim().toLowerCase();
  const nameMatch = (employee?.fullName || employee?.name || '').toLowerCase().includes(keyword);
  const idMatch = (employee?.employeeCode || employee?.id || row.employeeId || '').toLowerCase().includes(keyword);
  const logIdMatch = row._id.toLowerCase().includes(keyword);
  return nameMatch || idMatch || logIdMatch;
};

const getRowStatus = (
  record: TimeRecordsListRow,
  shifts: ShiftConfig[],
  employee?: Employee,
): AttendanceSyntheticStatus | null => {
  if (record.syntheticStatus) return record.syntheticStatus;

  const shift = findShiftByIdentifier(shifts, record.shiftId, employee ? getEmployeeCodeValue(employee) : record.employeeCode || record.employeeId);
  const clockIn = normalizeAttendanceTime(record.clockIn);
  const clockOut = normalizeAttendanceTime(record.clockOut);

  if (!clockIn && clockOut) {
    return isAfterCutoff(record.date, shift) ? 'missing_checkin' : 'pending_attendance';
  }
  if (clockIn && !clockOut) {
    return isAfterCutoff(record.date, shift) ? 'missing_checkout' : 'pending_checkout';
  }
  return null;
};

const findApprovedLeaveForDate = (
  employee: Employee,
  date: string,
  leaveRequests: LeaveRequest[],
  type: string,
): LeaveRequest | undefined => (
  leaveRequests.find((request) => {
    const requestEmployeeId = String(request.employeeId || '');
    const employeeMatches = 
      requestEmployeeId === employee.id || 
      requestEmployeeId === employee.employeeCode ||
      (employee._id && requestEmployeeId === String(employee._id));
    if (!employeeMatches) return false;
    if (String(request.status || '').toLowerCase() !== 'approved') return false;
    if (String(request.type || '') !== type) return false;
    return date >= request.startDate && date <= request.endDate;
  })
);

const enrichRow = (
  record: TimeRecordDocument,
  employees: Employee[],
  shifts: ShiftConfig[],
  fallbackId: string,
  leaveRequests: LeaveRequest[] = [],
): TimeRecordsListRow => {
  const row: TimeRecordsListRow = {
    ...(record as TimeRecordTimekeeping),
    _id: stringifyId(record._id) || fallbackId,
  };
  row.clockIn = normalizeAttendanceTime(row.clockIn);
  row.clockOut = normalizeAttendanceTime(row.clockOut);
  const employee = findEmployee(employees, row.employeeId);
  const employeeCode = employee ? getEmployeeCodeValue(employee) : row.employeeId;
  const shift = findShiftByIdentifier(shifts, row.shiftId, employeeCode);
  const isCompleted = Boolean(row.clockIn && row.clockOut);

  if (row.clockIn && shift) {
    row.lateMinutes = isCompleted ? calculateLateMinutes(shift, row.clockIn) : row.lateMinutes || 0;
  }
  if (row.clockOut && shift) {
    row.earlyMinutes = isCompleted ? calculateEarlyMinutes(shift, row.clockOut) : row.earlyMinutes || 0;
  }

  // Tự động bắt đơn xin phép đi muộn / về sớm đã duyệt
  if (employee && row.lateMinutes > 0) {
    const approvedLate = findApprovedLeaveForDate(employee, row.date, leaveRequests, 'arrive_late');
    if (approvedLate) {
      const allowedMinutes = approvedLate.requestedMinutes ?? row.lateMinutes;
      if (row.lateMinutes <= allowedMinutes) {
        row.lateReasonApproved = true;
        row.lateRequestedMinutes = allowedMinutes;
        row.lateReason = row.lateReason || approvedLate.reason || 'Đã xin phép đi muộn';
      }
    }
  }
  if (employee && row.earlyMinutes > 0) {
    const approvedEarly = findApprovedLeaveForDate(employee, row.date, leaveRequests, 'leave_early');
    if (approvedEarly) {
      const allowedMinutes = approvedEarly.requestedMinutes ?? row.earlyMinutes;
      if (row.earlyMinutes <= allowedMinutes) {
        row.earlyReasonApproved = true;
        row.earlyRequestedMinutes = allowedMinutes;
      }
    }
  }

  row.employeeName = employee?.fullName || employee?.name || row.employeeId;
  row.employeeCode = employee?.employeeCode || employee?.id || row.employeeId;
  row.employeeTypeLabel = getEmployeeTypeLabel(employee);
  row.employeeGroup = employee ? getEmployeeGroup(employee) : 'OTHER';
  row.groupName = employee?.departmentGroupName || employee?.deptGroupName || '';
  row.departmentName = employee?.departmentName || '';
  row.shiftName = shift?.name;
  row.rowStatus = getRowStatus(row, shifts, employee);
  return row;
};

const buildSyntheticRow = (
  employee: Employee,
  date: string,
  shifts: ShiftConfig[],
  leaveRequests: LeaveRequest[],
): TimeRecordsListRow => {
  const employeeGroup = getEmployeeGroup(employee);
  const employeeWorkType = getEmployeeWorkType(employee);
  const shift = getDefaultShiftForEmployee(
    shifts,
    employeeGroup,
    employeeWorkType,
    getEmployeeDepartmentGroupId(employee),
    getEmployeeCodeValue(employee),
  );
  const shiftId = getShiftIdentifier(shift);
  const status: AttendanceSyntheticStatus = shift
    ? hasApprovedLeave(employee, date, leaveRequests)
      ? 'leave_approved'
      : isAfterCutoff(date, shift)
        ? 'absent_unexcused'
        : 'pending_attendance'
    : 'no_shift';

  return {
    _id: `synthetic-${getEmployeeCodeValue(employee)}-${date}`,
    employeeId: getEmployeeCodeValue(employee),
    date,
    clockIn: null,
    clockOut: null,
    shiftId,
    locationId: employee.locationId || null,
    deviceType: 'System',
    gpsMatched: true,
    lateMinutes: 0,
    earlyMinutes: 0,
    reasonApproved: false,
    isSynthetic: true,
    syntheticStatus: status,
    rowStatus: status,
    employeeName: employee.fullName || employee.name || getEmployeeCodeValue(employee),
    employeeCode: getEmployeeCodeValue(employee),
    employeeTypeLabel: getEmployeeTypeLabel(employee),
    employeeGroup,
    shiftName: shift?.name,
    groupName: employee.departmentGroupName || employee.deptGroupName || '',
    departmentName: employee.departmentName || '',
  };
};

const readStateLeaveRequests = async (): Promise<LeaveRequest[]> => {
  try {
    const dbPath = path.join(process.cwd(), 'data.json');
    const data = await fs.readFile(dbPath, 'utf8');
    const state = JSON.parse(data) as { leaveRequests?: LeaveRequest[] };
    return Array.isArray(state.leaveRequests) ? state.leaveRequests : [];
  } catch {
    return [];
  }
};

const loadLeaveRequests = async (startDate?: string, endDate?: string, employeeIds?: string[]) => {
  const dbFilters: Record<string, unknown> = {};
  
  if (startDate || endDate) {
    dbFilters.startDate = { $lte: endDate || '9999-12-31' };
    dbFilters.endDate = { $gte: startDate || '0000-01-01' };
  }
  if (employeeIds && employeeIds.length > 0) {
    dbFilters.employeeId = { $in: employeeIds };
  }

  const [stateLeaves, dbLeaves] = await Promise.all([
    readStateLeaveRequests(),
    getAllRows<LeaveRequest & Record<string, unknown>>(LEAVES_COLLECTION, { filters: Object.keys(dbFilters).length > 0 ? dbFilters : undefined }).then((result) => result.data).catch(() => []),
  ]);

  const merged = new Map<string, LeaveRequest>();
  [...stateLeaves, ...dbLeaves].forEach((leave, index) => {
    const key = leave.id || `${leave.employeeId}-${leave.startDate}-${leave.endDate}-${index}`;
    merged.set(key, leave);
  });
  return Array.from(merged.values());
};

const buildEmployeeScopedQuery = (
  employees: Employee[],
  params: TimeRecordsListParams,
) => {
  const filters = { ...(params.filters || {}) };
  const selectedBranchIds = normalizeSelectedIds(params.selectedBranchIds, params.selectedBranchId);
  const selectedLocationIds = normalizeSelectedIds(params.selectedLocationIds, params.selectedLocationId);
  const selectedGroupIds = normalizeSelectedIds(params.selectedGroupIds, params.selectedGroupId);
  const selectedDeptIds = normalizeSelectedIds(params.selectedDeptIds, params.selectedDeptId);
  const hasOrgFilter = Boolean(
    selectedBranchIds.length > 0 ||
    selectedLocationIds.length > 0 ||
    selectedGroupIds.length > 0 ||
    selectedDeptIds.length > 0
  );
  const keyword = params.search?.trim() || '';
  const lowerKeyword = keyword.toLowerCase();
  let search = keyword || undefined;
  let employeePool = employees;

  if (hasOrgFilter) {
    employeePool = employeePool.filter((employee) => employeeMatchesOrgFilters(employee, params));
  }

  if (keyword) {
    const matchingEmployees = employeePool.filter((employee) => {
      const name = `${employee.fullName || ''} ${employee.name || ''}`.toLowerCase();
      const code = `${employee.employeeCode || ''} ${employee.id || ''}`.toLowerCase();
      return name.includes(lowerKeyword) || code.includes(lowerKeyword);
    });

    if (matchingEmployees.length > 0) {
      employeePool = matchingEmployees;
      search = undefined;
    }
  }

  if (hasOrgFilter || (keyword && !search)) {
    const employeeIds = Array.from(new Set(
      employeePool
        .map((employee) => employee.employeeCode || employee.id)
        .filter(Boolean),
    ));
    filters.employeeId = { $in: employeeIds };
  }

  return { filters, search, employeePool };
};

export async function getTimeRecordsList(params: TimeRecordsListParams): Promise<TimeRecordsListResult> {
  const page = params.page > 0 ? params.page : 1;
  const pageSize = Math.min(params.pageSize > 0 ? params.pageSize : 50, 200);
  const skip = params.skip ?? (page - 1) * pageSize;

  // Build DB filters for employees to avoid fetching the entire database
  const employeeDbFilters: Record<string, unknown> = {};
  const selectedBranchIds = normalizeSelectedIds(params.selectedBranchIds, params.selectedBranchId);
  const selectedLocationIds = normalizeSelectedIds(params.selectedLocationIds, params.selectedLocationId);
  const selectedGroupIds = normalizeSelectedIds(params.selectedGroupIds, params.selectedGroupId);
  const selectedDeptIds = normalizeSelectedIds(params.selectedDeptIds, params.selectedDeptId);

  if (selectedBranchIds.length > 0) employeeDbFilters.branchId = { $in: selectedBranchIds };
  if (selectedLocationIds.length > 0) employeeDbFilters.locationId = { $in: selectedLocationIds };
  if (selectedGroupIds.length > 0) employeeDbFilters.deptGroupId = { $in: selectedGroupIds };
  if (selectedDeptIds.length > 0) employeeDbFilters.departmentId = { $in: selectedDeptIds };

  // Apply explicit employeeId filter if it was passed from the client (e.g. from statistics page)
  if (params.filters?.employeeId) {
    employeeDbFilters.$or = [
      { employeeCode: params.filters.employeeId },
      { _id: params.filters.employeeId },
      { id: params.filters.employeeId }
    ];
  }

  const [employeesResult, shiftsResult] = await Promise.all([
    getAllRows<Employee & Record<string, unknown>>(EMPLOYEES_COLLECTION, { filters: Object.keys(employeeDbFilters).length > 0 ? employeeDbFilters : undefined }),
    getAllRows<ShiftConfig & Record<string, unknown>>(SHIFTS_COLLECTION, {}),
  ]);
  const rawEmployees = employeesResult.data;
  const shifts = shiftsResult.data;

  // Enrich dynamic department names and department group names for employees
  const uniqueDeptIds = Array.from(new Set(rawEmployees.map(emp => emp.departmentId?.toString()).filter((id): id is string => !!id)));
  const uniqueGroupIds = Array.from(new Set(rawEmployees.map(emp => emp.deptGroupId?.toString()).filter((id): id is string => !!id)));

  const toMongoIds = (ids: string[]): ObjectId[] => ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

  const [deptCol, groupCol] = await Promise.all([
    getCollection<{ _id: ObjectId; name?: string }>('departments_timekeeping'),
    getCollection<{ _id: ObjectId; name?: string }>('department_groups_timekeeping'),
  ]);

  const [departments, groups] = await Promise.all([
    uniqueDeptIds.length > 0 ? deptCol.find({ _id: { $in: toMongoIds(uniqueDeptIds) } }, { projection: { _id: 1, name: 1 } }).toArray() : [],
    uniqueGroupIds.length > 0 ? groupCol.find({ _id: { $in: toMongoIds(uniqueGroupIds) } }, { projection: { _id: 1, name: 1 } }).toArray() : [],
  ]);

  const departmentMap = new Map<string, string>();
  departments.forEach((d) => {
    if (d._id && typeof d.name === 'string') {
      departmentMap.set(d._id.toString(), d.name);
    }
  });

  const groupMap = new Map<string, string>();
  groups.forEach((g) => {
    if (g._id && typeof g.name === 'string') {
      groupMap.set(g._id.toString(), g.name);
    }
  });

  const employees = rawEmployees.map(emp => ({
    ...emp,
    departmentName: emp.departmentId ? String(departmentMap.get(emp.departmentId.toString()) || '') : undefined,
    departmentGroupName: emp.deptGroupId ? String(groupMap.get(emp.deptGroupId.toString()) || '') : undefined,
  })) as Employee[];
  
  const scopedQuery = buildEmployeeScopedQuery(employees, params);
  const filters = { ...scopedQuery.filters };

  // Only load leave requests relevant to the scoped employees and requested dates
  const detailStartDate = params.detailStartDate || params.startDate;
  const detailEndDate = params.detailEndDate || params.endDate;
  const scopedEmployeeIds = scopedQuery.employeePool.map(e => getEmployeeCodeValue(e));
  const leaveRequests = await loadLeaveRequests(detailStartDate, detailEndDate, scopedEmployeeIds);

  if (params.startDate || params.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (params.startDate) dateFilter.$gte = params.startDate;
    if (params.endDate) dateFilter.$lte = params.endDate;
    filters.date = dateFilter;
  }

  const result = await getAllRows<TimeRecordDocument>(TIME_RECORDS_COLLECTION, {
    search: scopedQuery.search,
    skip,
    limit: pageSize,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    sort: params.sort || DEFAULT_SORT,
  });

  const rows = result.data.map((record, index) => (
    enrichRow(record, employees, shifts, `log-${record.employeeId}-${record.date}-${record.clockIn || index}`, leaveRequests)
  ));

  const actualRows = rows.filter((row) => {
    const employee = findEmployee(employees, row.employeeId);
    return employeeMatchesOrgFilters(employee, params) && rowMatchesSearch(row, employee, params.search);
  });

  const dateList = detailStartDate && detailEndDate
    ? enumerateDates(detailStartDate, detailEndDate)
    : [dayjs().format('YYYY-MM-DD')];

  const existingEmployeeDateKeys = new Set(
    actualRows.map((row) => {
      const employee = findEmployee(employees, row.employeeId);
      return `${employee ? getEmployeeCodeValue(employee) : row.employeeId}-${row.date}`;
    }),
  );

  const syntheticRows = dateList.flatMap((date) => (
    scopedQuery.employeePool
      .filter((employee) => employeeMatchesOrgFilters(employee, params))
      .filter((employee) => !existingEmployeeDateKeys.has(`${getEmployeeCodeValue(employee)}-${date}`))
      .map((employee) => buildSyntheticRow(employee, date, shifts, leaveRequests))
  )).filter((row) => rowMatchesSearch(row, findEmployee(employees, row.employeeId), params.search));

  const detailRows = [...actualRows, ...syntheticRows].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return (a.employeeName || a.employeeId).localeCompare(b.employeeName || b.employeeId, 'vi');
  });

  const attendanceRequestSync = await syncAttendanceRequestsFromRows(detailRows).catch((error: unknown) => {
    console.error('Failed to sync attendance requests', error);
    return null;
  });

  return {
    data: rows,
    detailRows,
    total: result.total,
    page,
    pageSize,
    attendanceRequestSync,
  };
}

export async function ensureTimeRecordIndexes() {
  const collection = await getCollection<TimeRecordDocument>(TIME_RECORDS_COLLECTION);
  await Promise.all([
    collection.createIndex({ date: -1, clockIn: -1 }, { name: 'idx_time_records_date_clockIn' }),
    collection.createIndex({ employeeId: 1, date: -1 }, { name: 'idx_time_records_employee_date' }),
    collection.createIndex({ date: -1, employeeId: 1 }, { name: 'idx_time_records_date_employee' }),
  ]);
}
