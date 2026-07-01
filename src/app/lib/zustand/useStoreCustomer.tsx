import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
type TabKeyQuoteCustomer = {
  activeTabKey: string;
  setActiveTabKey: (item: string) => void;
  activeTabKeyQuote: string;
  setActiveTabKeyQuote: (item: string) => void;
};

export const useStoreTabCustomer = create<TabKeyQuoteCustomer>()(
  persist(
    (set) => ({
      activeTabKey: "care", // Giá trị mặc định
      setActiveTabKey: (key) => set({ activeTabKey: key }),
      activeTabKeyQuote: "quote-ct",
      setActiveTabKeyQuote: (key) => set({ activeTabKeyQuote: key }),
    }),
    {
      name: 'tab-customer-storage', // Tên key trong localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useStoreTabCustomer;
