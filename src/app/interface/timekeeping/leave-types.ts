export interface LeaveType {
  _id?: string;
  name: string;
  code: string;
  description?: string;
  isPaid: boolean;
  requireProof: boolean;
  maxDaysPerYear?: number;
  allowNegativeBalance?: boolean;
  noticePeriodDays?: number;
  maxConsecutiveDays?: number;
  requireProofForDays?: number;
  applicableBranches?: string[];
  applicableLocations?: string[];
  applicableGroups?: string[];
  applicableDepartments?: string[];
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LeaveConfig {
  _id?: string;
  allowPastDates: boolean;
  maxPastDays: number;
  allowFutureDates: boolean;
  maxFutureDays: number;
  requireHandover: boolean;
  requireApprovalLevels?: number;
  maxLeaveDaysPerMonth?: number;
  allowHalfDayLeave?: boolean;
  limitLateEarlyMinutes?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
