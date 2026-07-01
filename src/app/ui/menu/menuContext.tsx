import { createContext } from "react";
export type ItemType = {
  key: string;
  label?: string;
  icon?: React.ReactNode;
  children?: ItemType[];
};

type MenuContextType = {
  itemMenu?: ItemType;
  setItemMenu?: (item: ItemType) => void;
  collapsed?: boolean;
  setCollapsed?: (value: boolean) => void;
};

export const MenuContext = createContext<MenuContextType>({});
