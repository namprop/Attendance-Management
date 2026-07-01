import { Option } from "./interface/options";
import { optionTypeBox } from "./typebox";

export interface ProductType {
  id: string;   // Mã sản phẩm
  name: string; // Tên sản phẩm
  children?: Option[];
}

export const fakeTypeProducts: ProductType[] = [
  { id: "1", name: "CARTON SÓNG THƯỜNG", children: optionTypeBox },
  { id: "2", name: "CARTON SÓNG IN OFFSET", children: [] },
  { id: "3", name: "HỘP 1 LỚP", children: [] },
  { id: "4", name: "CARTON LẠNH", children: [] },
  { id: "5", name: "TÚI GIẤY", children: [] },
  { id: "6", name: "KHAY ĐỊNH HÌNH", children: [] },
  { id: "7", name: "BÓNG KHÍ, EVA, FOAM", children: [] },
  { id: "8", name: "MÀNG PE, MÀNG CHÍT", children: [] },
  { id: "9", name: "BĂNG DÍNH", children: [] },
  { id: "10", name: "TEM NHÃN", children: [] },
  { id: "11", name: "DECAN GIẤY", children: [] },
  { id: "12", name: "GIẤY 1 LỚP", children: [] },
];
