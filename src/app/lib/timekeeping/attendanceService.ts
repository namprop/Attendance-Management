import type { ShiftConfig } from '@/app/interface/timekeeping';

// ─────────────────────────────────────────────
// Loại nhóm nhân viên
// ─────────────────────────────────────────────
export type EmployeeGroup = 'SX' | 'OTHER';
export type EmployeeWorkType = 'FULL_TIME' | 'PART_TIME';

function normalizeId(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeId).filter(Boolean);
}

function normalizeEmployeeKey(value: unknown): string {
  return normalizeId(value).toLowerCase();
}

function getAssignedEmployeeKeys(shift: ShiftConfig): string[] {
  return normalizeIdList(shift.assignedEmployeeCodes).map((value) => value.toLowerCase());
}

function isShiftAssignedToEmployee(shift: ShiftConfig, employeeId?: string): boolean {
  const employeeKey = normalizeEmployeeKey(employeeId);
  if (!employeeKey) return false;
  return getAssignedEmployeeKeys(shift).includes(employeeKey);
}

function isSharedShift(shift: ShiftConfig): boolean {
  return getAssignedEmployeeKeys(shift).length === 0;
}

function shiftAppliesToEmployee(shift: ShiftConfig, employeeId?: string): boolean {
  return isSharedShift(shift) || isShiftAssignedToEmployee(shift, employeeId);
}

function scopeShiftsByEmployeeAssignment(shifts: ShiftConfig[], employeeId?: string): ShiftConfig[] {
  const activeShifts = shifts.filter((shift) => shift.isActive);
  const assignedShifts = activeShifts.filter((shift) => isShiftAssignedToEmployee(shift, employeeId));
  return assignedShifts.length > 0
    ? assignedShifts
    : activeShifts.filter(isSharedShift);
}

const normalizeSearchText = (value: unknown) => {
  const text = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

  return {
    spaced: text.replace(/[^a-z0-9]+/g, ' ').trim(),
    compact: text.replace(/[^a-z0-9]+/g, ''),
  };
};

const isProductionText = (value: string | undefined) => {
  const normalized = normalizeSearchText(value);
  return (
    normalized.spaced.split(' ').includes('sx') ||
    normalized.spaced.includes('san xuat') ||
    normalized.compact.includes('sanxuat') ||
    normalized.spaced.includes('production') ||
    normalized.compact.includes('production')
  );
};

const isPartTimeText = (value: string | undefined) => {
  const normalized = normalizeSearchText(value);
  return (
    normalized.spaced.includes('part time') ||
    normalized.compact.includes('parttime') ||
    normalized.spaced.includes('ban thoi gian') ||
    normalized.compact.includes('banthoigian')
  );
};

const isFullTimeText = (value: string | undefined) => {
  const normalized = normalizeSearchText(value);
  return (
    normalized.spaced.includes('full time') ||
    normalized.compact.includes('fulltime') ||
    normalized.spaced.includes('toan thoi gian') ||
    normalized.compact.includes('toanthoigian')
  );
};

const isAdministrativeText = (value: string | undefined) => {
  const normalized = normalizeSearchText(value);
  return (
    normalized.spaced.includes('hanh chinh') ||
    normalized.compact.includes('hanhchinh') ||
    normalized.spaced.split(' ').includes('hc') ||
    normalized.spaced.includes('administrative') ||
    normalized.compact.includes('administrative')
  );
};

const isPartialShiftText = (value: string | undefined) => {
  const normalized = normalizeSearchText(value);
  return (
    normalized.spaced.includes('ca sang') ||
    normalized.compact.includes('casang') ||
    normalized.spaced.includes('ca chieu') ||
    normalized.compact.includes('cachieu') ||
    normalized.spaced.includes('morning') ||
    normalized.spaced.includes('afternoon')
  );
};

export function getEmployeeGroup(employee: {
  role?: string;
  employeeType?: string;
  departmentId?: string;
  deptGroupId?: string;
  departmentName?: string;
  departmentGroupName?: string;
  deptGroupName?: string;
  locationName?: string;
}): EmployeeGroup {
  if (
    isProductionText(employee.role) ||
    isProductionText(employee.employeeType) ||
    isProductionText(employee.departmentId) ||
    isProductionText(employee.deptGroupId) ||
    isProductionText(employee.departmentName) ||
    isProductionText(employee.departmentGroupName) ||
    isProductionText(employee.deptGroupName) ||
    isProductionText(employee.locationName)
  ) {
    return 'SX';
  }
  return 'OTHER';
}

export function getEmployeeDepartmentGroupId(employee: {
  deptGroupId?: unknown;
  departmentGroupId?: unknown;
  departmentGroupTimekeepingId?: unknown;
}) {
  return (
    normalizeId(employee.deptGroupId) ||
    normalizeId(employee.departmentGroupId) ||
    normalizeId(employee.departmentGroupTimekeepingId)
  );
}

export function getEmployeeWorkType(employee: {
  role?: string;
  employeeType?: string;
}): EmployeeWorkType {
  if (isPartTimeText(employee.employeeType) || isPartTimeText(employee.role)) {
    return 'PART_TIME';
  }

  if (isFullTimeText(employee.employeeType) || isFullTimeText(employee.role)) {
    return 'FULL_TIME';
  }

  return 'FULL_TIME';
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Chuyển chuỗi "HH:MM" hoặc "HH:MM:SS" sang số phút kể từ 00:00 */
export function timeToMinutes(time: string | null | undefined): number {
  if (!time) return -1;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

/** Kiểm tra ca có phải ca Sản xuất không (dựa vào code/name chứa "SX") */
export function isShiftSX(shift: ShiftConfig): boolean {
  return isProductionText(shift.code) || isProductionText(shift.name);
}

function getShiftDurationMinutes(shift: ShiftConfig): number {
  const start = timeToMinutes(shift.startTime);
  const end = timeToMinutes(shift.endTime);
  if (start < 0 || end < 0) return 0;
  return end >= start ? end - start : end + 24 * 60 - start;
}

function normalizeEndAfterStart(start: number, end: number): number {
  return end >= start ? end : end + 24 * 60;
}

function getShiftTotalMinutes(shift: ShiftConfig): number {
  const configured = Number(shift.totalMinutes);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return getShiftDurationMinutes(shift);
}

function getShiftWorkUnit(shift: ShiftConfig): number {
  const workUnit = Number(shift.workUnit);
  return Number.isFinite(workUnit) ? workUnit : 0;
}

function isAdministrativeShift(shift: ShiftConfig): boolean {
  return isAdministrativeText(shift.code) || isAdministrativeText(shift.name);
}

function isPartialShift(shift: ShiftConfig): boolean {
  const workUnit = getShiftWorkUnit(shift);
  return (
    isPartialShiftText(shift.code) ||
    isPartialShiftText(shift.name) ||
    (workUnit > 0 && workUnit < 1) ||
    getShiftTotalMinutes(shift) <= 300
  );
}

function getShiftPreferenceScore(shift: ShiftConfig, employeeWorkType: EmployeeWorkType): number {
  const totalMinutes = getShiftTotalMinutes(shift);
  const workUnit = getShiftWorkUnit(shift);

  if (employeeWorkType === 'PART_TIME') {
    return (
      (isPartialShift(shift) ? 10_000 : 0) +
      (workUnit > 0 && workUnit < 1 ? 5_000 : 0) +
      (totalMinutes <= 300 ? 2_000 : 0) -
      totalMinutes
    );
  }

  return (
    (isAdministrativeShift(shift) ? 10_000 : 0) +
    (workUnit >= 1 ? 5_000 : 0) +
    (totalMinutes >= 420 ? 2_000 : 0) +
    totalMinutes
  );
}

function getShiftActualSpanScore(
  shift: ShiftConfig,
  clockInMin: number,
  clockOutMin: number,
): number {
  const shiftStart = timeToMinutes(shift.startTime);
  const shiftEndRaw = timeToMinutes(shift.endTime);
  if (shiftStart < 0 || shiftEndRaw < 0) return Number.MAX_SAFE_INTEGER;

  const actualEnd = normalizeEndAfterStart(clockInMin, clockOutMin);
  const shiftEnd = normalizeEndAfterStart(shiftStart, shiftEndRaw);
  const actualDuration = actualEnd - clockInMin;
  const shiftDuration = shiftEnd - shiftStart;
  const startDiff = Math.abs(clockInMin - shiftStart);
  const endDiff = Math.abs(actualEnd - shiftEnd);
  const durationDiff = Math.abs(actualDuration - shiftDuration);
  const outsidePenalty =
    Math.max(0, shiftStart - clockInMin) +
    Math.max(0, actualEnd - shiftEnd);

  return startDiff * 2 + endDiff * 2 + durationDiff + outsidePenalty * 3;
}

function isTimeInCheckInWindow(shift: ShiftConfig, nowMin: number): boolean {
  const start = shift.validCheckInStart
    ? timeToMinutes(shift.validCheckInStart)
    : shift.startTime
      ? timeToMinutes(shift.startTime) - 120
      : -1;
  const end = shift.validCheckInEnd
    ? timeToMinutes(shift.validCheckInEnd)
    : shift.endTime
      ? timeToMinutes(shift.endTime)
      : -1;

  if (start < 0 || end < 0) return false;
  return nowMin >= start && nowMin <= end;
}

function isTimeInCheckOutWindow(shift: ShiftConfig, nowMin: number): boolean {
  const start = shift.validCheckOutStart
    ? timeToMinutes(shift.validCheckOutStart)
    : shift.startTime
      ? timeToMinutes(shift.startTime)
      : -1;
  const end = shift.validCheckOutEnd
    ? timeToMinutes(shift.validCheckOutEnd)
    : shift.endTime
      ? timeToMinutes(shift.endTime) + 240
      : -1;

  if (start < 0 || end < 0) return false;
  return nowMin >= start && nowMin <= end;
}

function filterShiftsByEmployeeGroup(
  shifts: ShiftConfig[],
  employeeGroup: EmployeeGroup,
  employeeDepartmentGroupId?: string,
  employeeId?: string,
  employeeBranchId?: string,
  employeeLocationId?: string,
  employeeDepartmentId?: string,
) {
  const normalizedEmployeeGroupId = normalizeId(employeeDepartmentGroupId);
  const normalizedEmployeeBranchId = normalizeId(employeeBranchId);
  const normalizedEmployeeLocationId = normalizeId(employeeLocationId);
  const normalizedEmployeeDepartmentId = normalizeId(employeeDepartmentId);

  return scopeShiftsByEmployeeAssignment(shifts, employeeId).filter((shift) => {
    const shiftDepartmentGroupIds = normalizeIdList(shift.departmentGroupIds);
    const shiftBranchIds = normalizeIdList(shift.branchIds);
    const shiftLocationIds = normalizeIdList(shift.locationIds);
    const shiftDepartmentIds = normalizeIdList(shift.departmentIds);

    const hasAnyScopeConfigured =
      shiftDepartmentGroupIds.length > 0 ||
      shiftBranchIds.length > 0 ||
      shiftLocationIds.length > 0 ||
      shiftDepartmentIds.length > 0;

    if (hasAnyScopeConfigured) {
      let isMatch = false;
      if (shiftBranchIds.length > 0 && normalizedEmployeeBranchId && shiftBranchIds.includes(normalizedEmployeeBranchId)) isMatch = true;
      if (shiftLocationIds.length > 0 && normalizedEmployeeLocationId && shiftLocationIds.includes(normalizedEmployeeLocationId)) isMatch = true;
      if (shiftDepartmentGroupIds.length > 0 && normalizedEmployeeGroupId && shiftDepartmentGroupIds.includes(normalizedEmployeeGroupId)) isMatch = true;
      if (shiftDepartmentIds.length > 0 && normalizedEmployeeDepartmentId && shiftDepartmentIds.includes(normalizedEmployeeDepartmentId)) isMatch = true;

      return isMatch;
    }

    const shiftIsSX = isShiftSX(shift);
    if (employeeGroup === 'SX' && !shiftIsSX) return false;
    if (employeeGroup === 'OTHER' && shiftIsSX) return false;

    return true;
  });
}

export function getShiftIdentifier(shift: ShiftConfig | undefined): string | null {
  if (!shift) return null;
  return String(shift._id || shift.id || shift.code || '').trim() || null;
}

export function findShiftByIdentifier(
  shifts: ShiftConfig[],
  shiftId: string | null | undefined,
  employeeId?: string,
): ShiftConfig | undefined {
  const normalizedShiftId = String(shiftId || '').trim();
  if (!normalizedShiftId) return undefined;

  return shifts.find((shift) => (
    String(shift._id || '').trim() === normalizedShiftId ||
    String(shift.id || '').trim() === normalizedShiftId ||
    String(shift.code || '').trim() === normalizedShiftId
  ) && shiftAppliesToEmployee(shift, employeeId));
}

export function getDefaultShiftForEmployee(
  shifts: ShiftConfig[],
  employeeGroup: EmployeeGroup,
  employeeWorkType: EmployeeWorkType = 'FULL_TIME',
  employeeDepartmentGroupId?: string,
  employeeId?: string,
  employeeBranchId?: string,
  employeeLocationId?: string,
  employeeDepartmentId?: string,
): ShiftConfig | undefined {
  return filterShiftsByEmployeeGroup(shifts, employeeGroup, employeeDepartmentGroupId, employeeId, employeeBranchId, employeeLocationId, employeeDepartmentId)
    .sort((a, b) => (
      getShiftPreferenceScore(b, employeeWorkType) - getShiftPreferenceScore(a, employeeWorkType)
    ))[0];
}

// ─────────────────────────────────────────────
// Khớp ca (Shift Matching)
// ─────────────────────────────────────────────

/**
 * Tìm ca phù hợp khi CHECK-IN.
 * - Lọc ca theo nhóm nhân viên (SX chỉ khớp ca SX, OTHER chỉ khớp ca không-SX)
 * - So giờ check-in với cửa sổ validCheckInStart / validCheckInEnd của ca.
 *   Nếu ca chưa cấu hình validCheckIn thì dùng fallback: startTime - 60p ~ startTime + 120p
 */
export function matchCheckInShift(
  shifts: ShiftConfig[],
  timeStr: string,
  employeeGroup: EmployeeGroup,
  employeeWorkType: EmployeeWorkType = 'FULL_TIME',
  employeeDepartmentGroupId?: string,
  employeeId?: string,
  employeeBranchId?: string,
  employeeLocationId?: string,
  employeeDepartmentId?: string,
): ShiftConfig | undefined {
  const nowMin = timeToMinutes(timeStr);
  if (nowMin < 0) return undefined;

  const validShifts = filterShiftsByEmployeeGroup(shifts, employeeGroup, employeeDepartmentGroupId, employeeId, employeeBranchId, employeeLocationId, employeeDepartmentId).filter((shift) => (
    isTimeInCheckInWindow(shift, nowMin)
  ));

  if (validShifts.length === 0) return undefined;

  return validShifts.sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const aEnd = timeToMinutes(a.endTime);
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);

    // Ưu tiên 1: Giờ hiện tại nằm hoàn toàn trong khung giờ làm việc
    const aIsActive = nowMin >= aStart && nowMin <= aEnd ? 1 : 0;
    const bIsActive = nowMin >= bStart && nowMin <= bEnd ? 1 : 0;

    if (aIsActive !== bIsActive) {
      return bIsActive - aIsActive;
    }

    // Ưu tiên 2: Giờ bắt đầu gần với giờ hiện tại nhất
    const startDiff = Math.abs(nowMin - aStart) - Math.abs(nowMin - bStart);
    if (startDiff !== 0) return startDiff;

    const preferenceDiff =
      getShiftPreferenceScore(b, employeeWorkType) - getShiftPreferenceScore(a, employeeWorkType);
    if (preferenceDiff !== 0) return preferenceDiff;

    return employeeWorkType === 'PART_TIME' ? aEnd - bEnd : bEnd - aEnd;
  })[0];
}

/**
 * Tìm ca phù hợp khi CHECK-OUT.
 * Logic tương tự nhưng dùng cửa sổ validCheckOutStart / validCheckOutEnd.
 */
export function matchCheckOutShift(
  shifts: ShiftConfig[],
  timeStr: string,
  employeeGroup: EmployeeGroup,
  employeeWorkType: EmployeeWorkType = 'FULL_TIME',
  employeeDepartmentGroupId?: string,
  employeeId?: string,
  employeeBranchId?: string,
  employeeLocationId?: string,
  employeeDepartmentId?: string,
): ShiftConfig | undefined {
  const nowMin = timeToMinutes(timeStr);
  if (nowMin < 0) return undefined;

  const validShifts = filterShiftsByEmployeeGroup(shifts, employeeGroup, employeeDepartmentGroupId, employeeId, employeeBranchId, employeeLocationId, employeeDepartmentId).filter((shift) => (
    isTimeInCheckOutWindow(shift, nowMin)
  ));

  if (validShifts.length === 0) return undefined;

  return validShifts.sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const aEnd = timeToMinutes(a.endTime);
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);

    // Ưu tiên 1: Giờ hiện tại nằm trong khung giờ làm việc
    const aIsActive = nowMin >= aStart && nowMin <= aEnd ? 1 : 0;
    const bIsActive = nowMin >= bStart && nowMin <= bEnd ? 1 : 0;

    if (aIsActive !== bIsActive) {
      return bIsActive - aIsActive;
    }

    // Ưu tiên 2: Giờ kết thúc gần với giờ hiện tại nhất
    const endDiff = Math.abs(nowMin - aEnd) - Math.abs(nowMin - bEnd);
    if (endDiff !== 0) return endDiff;

    return getShiftPreferenceScore(b, employeeWorkType) - getShiftPreferenceScore(a, employeeWorkType);
  })[0];
}

function matchAttendanceShift(
  shifts: ShiftConfig[],
  clockInTime: string | null | undefined,
  clockOutTime: string,
  employeeGroup: EmployeeGroup,
  employeeWorkType: EmployeeWorkType,
  employeeDepartmentGroupId?: string,
  employeeId?: string,
  employeeBranchId?: string,
  employeeLocationId?: string,
  employeeDepartmentId?: string,
): ShiftConfig | undefined {
  const clockInMin = timeToMinutes(clockInTime);
  const clockOutMin = timeToMinutes(clockOutTime);
  if (clockInMin < 0 || clockOutMin < 0) return undefined;

  const validShifts = filterShiftsByEmployeeGroup(shifts, employeeGroup, employeeDepartmentGroupId, employeeId, employeeBranchId, employeeLocationId, employeeDepartmentId).filter((shift) => (
    isTimeInCheckInWindow(shift, clockInMin) && isTimeInCheckOutWindow(shift, clockOutMin)
  ));

  if (validShifts.length === 0) return undefined;

  return validShifts.sort((a, b) => {
    const spanDiff =
      getShiftActualSpanScore(a, clockInMin, clockOutMin) -
      getShiftActualSpanScore(b, clockInMin, clockOutMin);
    if (spanDiff !== 0) return spanDiff;

    const preferenceDiff = getShiftPreferenceScore(b, employeeWorkType) - getShiftPreferenceScore(a, employeeWorkType);
    if (preferenceDiff !== 0) return preferenceDiff;

    const durationDiff = getShiftDurationMinutes(a) - getShiftDurationMinutes(b);
    return employeeWorkType === 'PART_TIME' ? durationDiff : -durationDiff;
  })[0];
}

// ─────────────────────────────────────────────
// Tính số phút trễ / về sớm
// ─────────────────────────────────────────────

/**
 * Tính số phút đi trễ so với giờ bắt đầu ca.
 * Trả về 0 nếu vào đúng giờ hoặc sớm hơn.
 */
export function calculateLateMinutes(
  shift: ShiftConfig,
  clockInTime: string,
): number {
  const shiftStart = timeToMinutes(shift.startTime);
  const actualIn = timeToMinutes(clockInTime);
  if (shiftStart < 0 || actualIn < 0) return 0;
  return Math.max(0, actualIn - shiftStart);
}

/**
 * Tính số phút về sớm so với giờ kết thúc ca.
 * Trả về 0 nếu ra đúng giờ hoặc muộn hơn.
 */
export function calculateEarlyMinutes(
  shift: ShiftConfig,
  clockOutTime: string,
): number {
  const shiftEnd = timeToMinutes(shift.endTime);
  const actualOut = timeToMinutes(clockOutTime);
  if (shiftEnd < 0 || actualOut < 0) return 0;
  return Math.max(0, shiftEnd - actualOut);
}

// ─────────────────────────────────────────────
// Tạo payload chấm công hoàn chỉnh
// ─────────────────────────────────────────────

export interface CheckInPayload {
  action: 'add';
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: null;
  shiftId: string | null;
  deviceType: string;
  gpsMatched: boolean;
  lateMinutes: number;
  earlyMinutes: number;
  reasonApproved: boolean;
}

export interface CheckOutPayload {
  action: 'edit';
  _id: string;
  clockOut: string;
  shiftId?: string | null;
  lateMinutes?: number;
  earlyMinutes: number;
}

/**
 * Tạo payload cho lần CHECK-IN.
 * Tự động khớp ca và tính lateMinutes.
 */
export function buildCheckInPayload(params: {
  employeeId: string;
  date: string;
  timeStr: string;
  deviceType: string;
  shifts: ShiftConfig[];
  employeeGroup: EmployeeGroup;
  employeeWorkType?: EmployeeWorkType;
  employeeDepartmentGroupId?: string;
  employeeBranchId?: string;
  employeeLocationId?: string;
  employeeDepartmentId?: string;
}): CheckInPayload {
  const {
    employeeId,
    date,
    timeStr,
    deviceType,
    shifts,
    employeeGroup,
    employeeWorkType = 'FULL_TIME',
    employeeDepartmentGroupId,
    employeeBranchId,
    employeeLocationId,
    employeeDepartmentId,
  } = params;
  const matchedShift = matchCheckInShift(
    shifts,
    timeStr,
    employeeGroup,
    employeeWorkType,
    employeeDepartmentGroupId,
    employeeId,
    employeeBranchId,
    employeeLocationId,
    employeeDepartmentId,
  );
  const lateMinutes = matchedShift ? calculateLateMinutes(matchedShift, timeStr) : 0;

  return {
    action: 'add',
    employeeId,
    date,
    clockIn: timeStr,
    clockOut: null,
    shiftId: getShiftIdentifier(matchedShift),
    deviceType,
    gpsMatched: true,
    lateMinutes,
    earlyMinutes: 0,
    reasonApproved: false,
  };
}

/**
 * Tạo payload cho lần CHECK-OUT.
 * Tự động tìm ca và tính earlyMinutes.
 */
export function buildCheckOutPayload(params: {
  recordId: string;
  timeStr: string;
  clockInTime?: string | null;
  existingShiftId?: string | null;
  shifts: ShiftConfig[];
  employeeGroup: EmployeeGroup;
  employeeWorkType?: EmployeeWorkType;
  employeeDepartmentGroupId?: string;
  employeeId?: string;
  employeeBranchId?: string;
  employeeLocationId?: string;
  employeeDepartmentId?: string;
}): CheckOutPayload {
  const {
    recordId,
    timeStr,
    clockInTime,
    existingShiftId,
    shifts,
    employeeGroup,
    employeeWorkType = 'FULL_TIME',
    employeeDepartmentGroupId,
    employeeId,
    employeeBranchId,
    employeeLocationId,
    employeeDepartmentId,
  } = params;

  const existingShift = findShiftByIdentifier(shifts, existingShiftId, employeeId);
  const matchedByFullRecord = matchAttendanceShift(
    shifts,
    clockInTime,
    timeStr,
    employeeGroup,
    employeeWorkType,
    employeeDepartmentGroupId,
    employeeId,
    employeeBranchId,
    employeeLocationId,
    employeeDepartmentId,
  );
  const matchedByCheckOut = matchCheckOutShift(
    shifts,
    timeStr,
    employeeGroup,
    employeeWorkType,
    employeeDepartmentGroupId,
    employeeId,
    employeeBranchId,
    employeeLocationId,
    employeeDepartmentId,
  );
  const matchedShift = matchedByFullRecord ?? existingShift ?? matchedByCheckOut;

  const earlyMinutes = matchedShift ? calculateEarlyMinutes(matchedShift, timeStr) : 0;
  const lateMinutes = matchedShift && clockInTime ? calculateLateMinutes(matchedShift, clockInTime) : undefined;

  return {
    action: 'edit',
    _id: recordId,
    clockOut: timeStr,
    shiftId: getShiftIdentifier(matchedShift),
    lateMinutes,
    earlyMinutes,
  };
}
