import { CheckboxGroupProps } from "antd/es/checkbox";
import { FileInfo } from "./interface/file";

export interface TransactionDetail {
  type: string;   // Loại 
  amount: number; // Số tiền tương ứng
}

export interface Transaction {
  [key: string]: unknown;
  idInvoice?: string;  // id hóa đơn
  tradingDay?: string; // ngày giao dịch
  moneyReceived?: number; // số tiền nhận
  moneySpent?: number; // số tiền chi
  typeTransaction?: string; // loại giao dịch
  reason?: string; // lý do
  incomeDetails?: TransactionDetail[]; // chi tiết thu
  expenseDetails?: TransactionDetail[]; // chi tiết chi
  target?: string; // thể loại hóa đơn
  // bank ==========
  idAccount?: string | number;
  nameAccount?: string; //tên bank hoặc tên user
  createdAt?: string;
  updatedAt?: string;
  // người nhận
  fileTransfer?: FileInfo[];
  historyId?: string;    // ID lịch sử liên quan (nếu cần)
}

export interface Option {
  [key: string]: unknown;
  label: string;
  value: string;
}

export const optionSellers: Option[] = [
  { label: "hupunaeeeeeeeeeeee", value: "1" },
  { label: "ketoan2", value: "2" },
  { label: "dola", value: "3" },
  { label: "máy in", value: "4" },
  { label: "mai sàn", value: "5" },
];

export interface WarehouseOption {
  label: string;
  value: string;
  nameKho: string;
  name?: string;
  address: string;
  province: string;
  district: string;
  phone: string;
  businessRegion?: string;
  ward?: string;
  street?: string;
}

export const optionAddress: WarehouseOption[] = [
  {
    label: "119 Ngõ 83 Tân Triều, Phường Thanh Trì, Hà Nội - 0924932309",
    value: "2",
    nameKho: "Kho Tân Triều",
    address: "119 Ngõ 83 Tân Triều",
    province: "Hà Nội",
    district: "Huyện Thanh Trì",
    phone: "0924932309"
  },
  {
    label: "Xưởng Carton - Bóng Khí - Băng Dính ( Cuối ngõ 215 triều khúc - Đối diện tòa nhà màu hồng), Xã Tân Triều, Huyện Thanh Trì, Hà Nội - 0921920965",
    value: "5",
    nameKho: "Xưởng Carton",
    address: "Cuối ngõ 215 Triều Khúc - Đối diện tòa nhà màu hồng",
    province: "Hà Nội",
    district: "Huyện Thanh Trì",
    phone: "0921920965"
  }
];

export const optionListPrice: Option[] = [
  { label: "Bảng giá chung", value: "1" },
  { label: "Giá mới", value: "2" },
];

export const optionSatusInvoice: Option[] = [
  { label: "Đang xử lý", value: "1" },
  { label: "Đã hoàn thành", value: "2" },
  { label: "Không giao được", value: "3" },
  { label: "Hủy đơn", value: "4" },
  { label: "Hoàn hàng", value: "5" },
  { label: "Đã tự động đối soát", value: "6" },
]

export const optionsCurrency: CheckboxGroupProps<string>["options"] = [
  { label: "VND", value: "1", className: "!p-1 !text-[11px] " },
  { label: "%", value: "2", className: "!p-1 !text-[11px]" },
];

export const optionsTypes: Option[] = [
  { label: "Tiền thu", value: "1" },
  { label: "Tiền chi", value: "2" },
]
