import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MemberFilterState {
  branch: string | null;
  location: string | null;
  face: string | null;
  deptGroup: string | null;
  department: string | null;
  status: string | null;
  employeeType: string | null;
  gender: string | null;
}

interface TablePreferenceState {
  memberPageSize: number;
  setMemberPageSize: (size: number) => void;
  isMemberSidebarOpen: boolean;
  setIsMemberSidebarOpen: (isOpen: boolean) => void;
  memberFilters: MemberFilterState;
  setMemberFilters: (filters: MemberFilterState) => void;
  memberViewMode: 'grid' | 'list';
  setMemberViewMode: (mode: 'grid' | 'list') => void;
}

export const useTablePreferenceStore = create<TablePreferenceState>()(
  persist(
    (set) => ({
      memberPageSize: 15,
      setMemberPageSize: (size) => set({ memberPageSize: size }),
      memberViewMode: 'list',
      setMemberViewMode: (mode) => set({ memberViewMode: mode }),
      isMemberSidebarOpen: true,
      setIsMemberSidebarOpen: (isOpen) => set({ isMemberSidebarOpen: isOpen }),
      memberFilters: {
        branch: null, location: null, face: null, deptGroup: null, department: null, status: null, employeeType: null, gender: null
      },
      setMemberFilters: (filters) => set({ memberFilters: filters })
    }),
    {
      name: 'table-preferences', // Tên lưu trong localStorage
    }
  )
);
