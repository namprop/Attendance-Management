// ─── Re-export all models ─────────────────────────────────────────────────────

export { employeeModel, EmployeeCreateSchema, EmployeeUpdateSchema } from './employee.model';
export type { EmployeeCreate, EmployeeUpdate } from './employee.model';

export * from './webAuthnCredential.model';
export * from './webAuthnChallenge.model';

export { timeRecordModel, TimeRecordCreateSchema, TimeRecordUpdateSchema } from './timeRecord.model';
export type {
  TimeRecordCreate,
  TimeRecordUpdate,
  WeeklyDayStat,
  TopLateEmployee,
  MonthlyRates,
  NotCheckedInEmployee,
  TodayAttendanceRow,
} from './timeRecord.model';

export { attendanceModel, AttendanceCreateSchema, AttendanceUpdateSchema } from './attendance.model';
export type { AttendanceCreate, AttendanceUpdate } from './attendance.model';

export { shiftConfigModel, ShiftConfigCreateSchema, ShiftConfigUpdateSchema } from './shiftConfig.model';
export type { ShiftConfigCreate, ShiftConfigUpdate } from './shiftConfig.model';

export {
  departmentGroupModel,
  departmentModel,
  DeptGroupCreateSchema,
  DepartmentCreateSchema,
} from './department.model';
export type { DeptGroupCreate, DepartmentCreate } from './department.model';

export { leaveRequestModel, LeaveRequestCreateSchema, LeaveRequestUpdateSchema } from './leaveRequest.model';
export type { LeaveRequestCreate, LeaveRequestUpdate } from './leaveRequest.model';

// ─── Re-export BaseRepository utilities ──────────────────────────────────────

export { BaseRepository, RepositoryValidationError } from '@/app/lib/monggodb/BaseRepository';
export type { QueryOptions, PaginatedResult } from '@/app/lib/monggodb/BaseRepository';
