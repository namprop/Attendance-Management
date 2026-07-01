export interface AttendanceDayItem {
  date: string;
  lateMinutes: string | number;
  earlyMinutes: string | number;
  work: string | number;
}

export interface AttendanceEmailProps {
  employeeName: string;
  employeeCode: string;
  department: string;
  employeeType: string;
  periodLabel: string;
  workTotal: number | string;
  lateCount: number | string;
  totalLateMinutes: number | string;
  earlyCount: number | string;
  totalEarlyMinutes: number | string;
  attendanceStatus: string;
  days: AttendanceDayItem[];
}

export interface PayslipEmailProps {
  employeeName: string;
  employeeCode: string;
  department: string;
  payrollMonth: string;
  salaryRemaining: number | string;
  totalBaseSalaryEarned: number | string;
  allowanceLunch: number | string;
  allowanceTravel: number | string;
  allowanceAttendance: number | string;
  allowancePosition: number | string;
  salaryAndAllowance: number | string;
  bonusCommission: number | string;
  bonusRevenue: number | string;
  bonusOther: number | string;
  supportOther: number | string;
  penalty: number | string;
  insuranceBHXH: number | string;
  salaryTheory: number | string;
  unionFee: number | string;
  salaryActual: number | string;
  advancePayment: number | string;
  paymentStatus: string;
}

export interface WelcomeEmailProps {
  employeeName: string;
  email: string;
  employeeCode: string;
  department: string;
  loginUrl?: string;
}
