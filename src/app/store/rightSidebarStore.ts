import { create } from 'zustand';
import { ReactNode } from 'react';

interface SidebarState {
  isOpen: boolean;
  title: ReactNode | string;
  content: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  showCloseButton?: boolean;
}

interface SidebarActions {
  openSidebar: (params: Omit<SidebarState, 'isOpen'>) => void;
  closeSidebar: () => void;
  setContent: (content: ReactNode) => void;
  setTitle: (title: ReactNode | string) => void;
}

const initialState: SidebarState = {
  isOpen: false,
  title: '',
  content: null,
  footer: undefined,
  width: 450, // Mặc định 450px, rộng rãi thoải mái
  showCloseButton: true,
};

export const useRightSidebarStore = create<SidebarState & SidebarActions>((set) => ({
  ...initialState,
  
  openSidebar: (params) => set({ ...params, isOpen: true }),
  
  closeSidebar: () => set({ isOpen: false }),
  
  setContent: (content) => set({ content }),
  
  setTitle: (title) => set({ title }),
}));
