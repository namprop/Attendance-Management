import { create } from "zustand";

interface LocationState {
  location: string;
  branchId: string;
  hasHydrated: boolean;
  setLocation: (location: string) => void;
  setBranchId: (branchId: string) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: "",
  branchId: "",
  hasHydrated: true,
  setLocation: (location) => set({ location }),
  setBranchId: (branchId) => set({ branchId }),
  setHasHydrated: (state) => set({ hasHydrated: state }),
}));
