export interface BalanceHistory {
  id?: string;
  relatedId: string;      // ID của User (nếu là cash) hoặc ID của AccountBank
  type: 'cash' | 'bank';  // Loại tài khoản
  balance: number;        // Số dư tại thời điểm chốt
  date: string;           // Ngày chốt (Format: YYYY-MM-DD)
  createdAt: string;      // Thời điểm chạy lệnh chốt
}
export interface User {
  [key: string]: unknown;
  id?: number;
  name?: string;
  username?: string;
  password?: string;
  status?: number;
  department?: number;
  role?: number;
  level?: number; // 0: Normal, 1: VIP, 2: PRO

  cash?: number; //tiền mặt
  bankAccount?: string[]; //tài khoản ngân hàng
  typeAccount?: string; //loại tài khoản
  branch?: string; //chi nhánh
  company?: string; //công ty
  location?: string; //vị trí
  dailyBalances?: BalanceHistory[]; //số tiền ngày
}

export const fakeUserLevels = [
  { value: 0, label: "Thường" },
  { value: 1, label: "VIP (Tài khoản VIP)" },
  { value: 2, label: "PRO (Tài khoản PRO)" },
];

export interface Department {
  id: number;
  name: string;
}

export type Role = {
  id: number;
  name: string;
  permissions: string[]; // danh sách quyền
};

export interface UserStatus {
  label: string;
  value: number;
}

export const fakeUserStatus: UserStatus[] = [
  { label: "Đang hoạt động", value: 1 },
  { label: "Ngừng hoạt động", value: 2 },
];
