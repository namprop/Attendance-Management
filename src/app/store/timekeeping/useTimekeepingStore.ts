'use client';

import { create } from 'zustand';
import type {
  Employee,
  WorkShift,
  CheckInLog,
  LeaveRequest,
  OfficeConfig,
} from '@/app/interface/timekeeping';

interface TimekeepingStore {
  // Data
  employees: Employee[];
  shifts: WorkShift[];
  logs: CheckInLog[];
  leaveRequests: LeaveRequest[];
  pendingLeavesCount: number;
  pendingOvertimeCount: number;
  officeConfig: OfficeConfig | null;
  isLoading: boolean;

  // UI State
  activeEmployeeId: string;
  selectedAIEmployeeId: string;

  // Actions
  setEmployees: (employees: Employee[]) => void;
  setShifts: (shifts: WorkShift[]) => void;
  setLogs: (logs: CheckInLog[]) => void;
  setLeaveRequests: (leaveRequests: LeaveRequest[]) => void;
  setPendingLeavesCount: (count: number) => void;
  setPendingOvertimeCount: (count: number) => void;
  setOfficeConfig: (config: OfficeConfig | null) => void;
  setIsLoading: (loading: boolean) => void;
  setActiveEmployeeId: (id: string) => void;
  setSelectedAIEmployeeId: (id: string) => void;
  refreshState: () => Promise<void>;
  refreshPendingLeavesCount: () => Promise<void>;
  refreshPendingOvertimeCount: () => Promise<void>;
}

export const useTimekeepingStore = create<TimekeepingStore>((set) => ({
  employees: [],
  shifts: [],
  logs: [],
  leaveRequests: [],
  pendingLeavesCount: 0,
  pendingOvertimeCount: 0,
  officeConfig: null,
  isLoading: true,
  activeEmployeeId: 'EMP001',
  selectedAIEmployeeId: 'EMP001',

  setEmployees: (employees) => set({ employees }),
  setShifts: (shifts) => set({ shifts }),
  setLogs: (logs) => set({ logs }),
  setLeaveRequests: (leaveRequests) => set({ leaveRequests }),
  setPendingLeavesCount: (pendingLeavesCount) => set({ pendingLeavesCount }),
  setPendingOvertimeCount: (pendingOvertimeCount) => set({ pendingOvertimeCount }),
  setOfficeConfig: (officeConfig) => set({ officeConfig }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveEmployeeId: (activeEmployeeId) => set({ activeEmployeeId }),
  setSelectedAIEmployeeId: (selectedAIEmployeeId) => set({ selectedAIEmployeeId }),

  refreshState: async () => {
    try {
      const response = await fetch('/api/state');
      const data = await response.json();
      set({
        employees: data.employees || [],
        shifts: data.shifts || [],
        logs: data.logs || [],
        leaveRequests: data.leaveRequests || [],
        officeConfig: data.officeConfig || null,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to retrieve timekeeping state', err);
      set({ isLoading: false });
    }
  },

  refreshPendingLeavesCount: async () => {
    try {
      const params = new URLSearchParams({
        status: 'Pending',
        page: '1',
        pageSize: '1',
      });
      const response = await fetch(`/api/leave-requests?${params.toString()}`);
      const data = await response.json();
      const total = Number(data.total);
      set({ pendingLeavesCount: Number.isFinite(total) ? total : 0 });
    } catch (err) {
      console.error('Failed to retrieve pending leave request count', err);
    }
  },

  refreshPendingOvertimeCount: async () => {
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const params = new URLSearchParams({
        status: 'pending',
        page: '1',
        pageSize: '1',
        fromDate: todayStr, // Bỏ qua các đơn đã hết hạn (trước ngày hôm nay)
      });
      const response = await fetch(`/api/overtime-requests?${params.toString()}`);
      const data = await response.json();
      const total = Number(data.total);
      set({ pendingOvertimeCount: Number.isFinite(total) ? total : 0 });
    } catch (err) {
      console.error('Failed to retrieve pending overtime requests count', err);
    }
  },
}));
