export interface Employee {
  _id?: string;
  id: string;
  employeeCode?: string;
  fullName?: string;
  name: string;
  role: string;
  employeeType?: 'full_time' | 'part_time' | string;
  email: string;
  phone?: string;
  gender?: string;
  status: 'Active' | 'Inactive' | 'ACTIVE' | 'INACTIVE' | string;
  avatar: string;
  branchId?: string;
  branchName?: string;
  branch?: { name: string };
  locationId?: string;
  locationName?: string;
  location?: { locationName: string };
  deptGroupId?: string;
  departmentGroupId?: string;
  departmentId?: string;
  departmentName?: string;
  department?: { name: string };
  departmentGroupName?: string;
  deptGroupName?: string;
  deptGroup?: { name: string };
  identityCard?: string;
  dateOfBirth?: string;
  joinDate: string;
  bankAccount?: string;
  bankName?: string;
  taxCode?: string;
  baseSalary?: number;
  insuranceSalary?: number;
  address?: string;
  enrollNumber?: string;
  unaccentedName?: string;
  cardNo?: string;
  devicePassword?: string;
  devicePrivilege?: string;
  isEnabled?: boolean;
  nativePlace?: string;
  ethnicity?: string;
  nationality?: string;
  faceEnrolled?: boolean;
  biometricData?: {
    faceVectors?: unknown[];
  };
  createdAt?: string | Date;
  updatedAt?: string | Date;
  currentChallenge?: string;
}

export interface WorkShift {
  id: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  graceMinutes: number;
  workingHours: number;
}

export interface ShiftConfig {
  _id?: string;
  id: string;
  code: string;
  name: string;
  branchIds?: string[];
  locationIds?: string[];
  departmentGroupIds?: string[];
  departmentIds?: string[];
  assignedEmployeeCodes?: string[];
  startTime: string;
  endTime: string;
  crossDayCount: string;
  breakStartTime: string;
  breakEndTime: string;
  totalMinutes: string;
  workUnit: string;
  validCheckInStart: string;
  validCheckInEnd: string;
  validCheckOutStart: string;
  validCheckOutEnd: string;
  noCheckOutMinutes: string;
  noCheckInMinutes: string;
  displayOrder: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CheckInLog {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // HH:MM:SS
  clockOut: string | null; // HH:MM:SS
  lateMinutes: number;
  earlyMinutes: number;
  shiftId: string;
  gpsMatched: boolean;
  deviceType: 'Web' | 'FaceID' | 'WiFi' | string;
  notes?: string;
  lateReason?: string;
  reasonApproved?: boolean;
  approvedBy?: string;
}

export interface TimeRecordTimekeeping {
  _id?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // HH:MM:SS
  clockOut: string | null; // HH:MM:SS
  shiftId: string | null;
  locationId: string | null;
  deviceType: 'Web' | 'FaceID' | 'WiFi' | string;
  gpsMatched: boolean;
  lateMinutes: number;
  earlyMinutes: number;
  overtimeMinutes?: number;
  lateReason?: string;
  reasonApproved: boolean;
  lateReasonApproved?: boolean;
  earlyReasonApproved?: boolean;
  lateRequestedMinutes?: number;
  earlyRequestedMinutes?: number;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface LeaveRequest {
  id?: string;
  _id?: string;
  employeeId?: string;
  employeeCode: string;
  employeeName: string;
  employeeRole?: string;
  branch?: string;
  branchId?: string;
  locationId?: string;
  deptGroupId?: string;
  department?: string;
  departmentId?: string;
  phone?: string;
  address?: string;
  type: string; // mã hình thức nghỉ
  typeName?: string; // Tên hình thức nghỉ (tuỳ chọn lưu kèm)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  totalDays?: number;
  totalMinutes?: number;
  requestedMinutes?: number;
  reason: string;
  handoverPerson?: string;
  handoverTo?: string;
  handoverDept?: string;
  handoverTasks?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt?: string | Date;
  resolvedAt?: string | Date;
  resolvedBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type AttendanceRequestType =
  | 'forgot_checkin'
  | 'forgot_checkout'
  | 'online_checkin'
  | 'time_adjustment';

export type AttendanceRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired';

export interface AttendanceRequest {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  date: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  requestedMinutes?: number;
  shiftId?: string | null;
  shiftName?: string;
  timeRecordId?: string | null;
  requestType: AttendanceRequestType;
  status: AttendanceRequestStatus;
  source?: 'auto_cutoff' | 'employee' | 'admin' | string;
  currentCheckIn?: string | null;
  currentCheckOut?: string | null;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason?: string;
  adminNote?: string;
  detectedAt?: string;
  requestedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface OfficeConfig {
  latitude: number;
  longitude: number;
  radius: number; // meters
  wifiBssid: string;
  wifiSsid: string;
}

export interface BranchTimekeeping {
  _id?: string;
  id: string;
  code: string;
  name: string;
  location: string;
  status: 'Active' | 'Inactive';
  shortCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KioskLocation {
  _id: string;
  locationName: string;
  locationSlug: string;
  branchId?: string;
  branchName?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  allowedRadiusMeters?: number;
  shortCode?: string;
  status: string;
}

export interface DepartmentGroupTimekeeping {
  _id?: string; // string representation of ObjectId for UI
  locationId?: string;
  locationName?: string;
  code: string;
  name: string;
  shortCode?: string;
  isActive: boolean;
}

export interface DepartmentTimekeeping {
  _id?: string;
  locationId?: string;
  departmentGroupTimekeepingId?: string;
  code: string;
  name: string;
  shortName: string;
  shortCode?: string;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface HardwareRow {
  employeeId: string;
  date: string;
  time: string;
  type: 'IN' | 'OUT';
}

export interface ZktecoDevice {
  _id?: string;
  deviceName: string;
  connectorUrl: string; // VD: https://hanoi.abc.com
  connectorId?: string;
  ipAddress: string;    // VD: 192.168.1.10
  port?: number;
  locationId: string;
  locationName?: string;
  branchId?: string;
  branchName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  deviceToken?: string;
  tokenExpiry?: string;
  expiresAt?: string | Date | null;
  note?: string;
  requireGps?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface KioskDevice {
  _id?: string;
  deviceName: string;
  ipAddress: string;
  locationId: string;
  locationSlug: string;
  locationName: string;
  status: 'ACTIVE' | 'INACTIVE';
  deviceToken?: string;
  tokenExpiry?: string;
  expiresAt?: string | Date | null;
  note?: string;
  requireGps?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimekeepingState {
  employees: Employee[];
  shifts: WorkShift[];
  logs: CheckInLog[];
  leaveRequests: LeaveRequest[];
  'branch-timekeeping'?: BranchTimekeeping[];
  officeConfig: OfficeConfig | null;
  isLoading: boolean;
}

export interface Attendance {
  _id?: string;
  userId: string;
  date: Date | string;
  employeeType: 'full_time' | 'part_time' | string;
  salaryType: 'daily' | 'hourly' | string;
  shift: {
    shiftId: string;
    name: string;
    startTime: string;
    endTime: string;
    standardHours: number;
  };
  checkIn?: string;
  checkOut?: string;
  checkInAt?: Date | string;
  checkOutAt?: Date | string;
  workHours?: number;
  standardHours?: number;
  workUnit?: number;
  payableHours?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtime?: {
    tc1: number;
    tc2: number;
    tc3: number;
  };
  workPlus?: number;
  khPlus?: number;
  status?: 'present' | 'absent' | 'leave' | 'late' | 'incomplete' | string;
  attendanceSource?: 'machine' | 'qr' | 'manual' | string;
  note?: string;
  calculatedSalary?: number;
  month: number;
  year: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface OvertimeRequest {
  _id?: string;
  id?: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  department?: string;
  departmentId?: string;
  branchId?: string;
  locationId?: string;
  date: string;            // YYYY-MM-DD
  overtimeStart: string;   // HH:mm — giờ bắt đầu tăng ca
  overtimeEnd: string;     // HH:mm — giờ kết thúc tăng ca
  plannedMinutes: number;  // overtimeEnd - overtimeStart
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  overtimeType?: string;
  workMode?: 'online' | 'offline';
  actualMinutes?: number;  // tính được sau khi có check-out thực tế
  resolvedBy?: string;
  resolvedAt?: string;
  requestedAt?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export * from './leave-types';
