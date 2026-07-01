'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimeRecordsFilterState {
  selectedBranchIds: string[];
  selectedLocationIds: string[];
  selectedGroupIds: string[];
  selectedDeptIds: string[];
  searchKeyword: string;
  dateRange: [string | null, string | null];

  setSelectedBranchIds: (ids: string[]) => void;
  setSelectedLocationIds: (ids: string[]) => void;
  setSelectedGroupIds: (ids: string[]) => void;
  setSelectedDeptIds: (ids: string[]) => void;
  setSearchKeyword: (kw: string) => void;
  setDateRange: (range: [string | null, string | null]) => void;
  resetFilters: () => void;
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return typeof value === 'string' && value.trim() ? [value] : [];
};

export const useTimeRecordsFilterStore = create<TimeRecordsFilterState>()(
  persist(
    (set) => ({
      selectedBranchIds: [],
      selectedLocationIds: [],
      selectedGroupIds: [],
      selectedDeptIds: [],
      searchKeyword: '',
      dateRange: [null, null],

      setSelectedBranchIds: (selectedBranchIds) => set({ selectedBranchIds }),
      setSelectedLocationIds: (selectedLocationIds) => set({ selectedLocationIds }),
      setSelectedGroupIds: (selectedGroupIds) => set({ selectedGroupIds }),
      setSelectedDeptIds: (selectedDeptIds) => set({ selectedDeptIds }),
      setSearchKeyword: (searchKeyword) => set({ searchKeyword }),
      setDateRange: (dateRange) => set({ dateRange }),
      resetFilters: () =>
        set({
          selectedBranchIds: [],
          selectedLocationIds: [],
          selectedGroupIds: [],
          selectedDeptIds: [],
          searchKeyword: '',
          dateRange: [null, null],
        }),
    }),
    {
      name: 'time-records-filter-storage',
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<TimeRecordsFilterState> & {
          selectedBranchId?: unknown;
          selectedLocationId?: unknown;
          selectedGroupId?: unknown;
          selectedDeptId?: unknown;
        };

        return {
          ...state,
          selectedBranchIds: toStringArray(state.selectedBranchIds ?? state.selectedBranchId),
          selectedLocationIds: toStringArray(state.selectedLocationIds ?? state.selectedLocationId),
          selectedGroupIds: toStringArray(state.selectedGroupIds ?? state.selectedGroupId),
          selectedDeptIds: toStringArray(state.selectedDeptIds ?? state.selectedDeptId),
        } as TimeRecordsFilterState;
      },
    }
  )
);
