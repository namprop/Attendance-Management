import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
type TabKeyQuickQuote = {
  activeTabKey: string;
  setActiveTabKey: (item: string) => void;
};

export const useStoreTabQuickQuote = create<TabKeyQuickQuote>()(
  persist(
    (set) => ({
      activeTabKey: "info", // Giá trị mặc định
      setActiveTabKey: (val) => set({ activeTabKey: val }),
    }),
    {
      name: 'tab-quick-quote-storage', // Tên key trong localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useStoreTabQuickQuote;
