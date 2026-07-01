import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
type TabKeyQuote = {
  activeTabKey: string;
  setActiveTabKey: (item: string) => void;
};

// const useStoreTabQuote = create<TabKeyQuote>((set) => ({
//   activeTabKey: "info",
//   setActiveTabKey: (val) => set({ activeTabKey: val }),
// }));

// export default useStoreTabQuote;

export const useStoreTabQuote = create<TabKeyQuote>()(
  persist(
    (set) => ({
      activeTabKey: "info", // Giá trị mặc định
      setActiveTabKey: (val) => set({ activeTabKey: val }),
    }),
    {
      name: 'tab-quote-storage', // Tên key trong localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useStoreTabQuote;
