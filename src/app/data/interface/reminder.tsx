import { FileInfo } from "@/app/data/interface/file";

export type ReminderType = 'FIXED' | 'RANGE' | 'BIRTHDAY';

export interface IReminder {
  [key: string]: unknown;
  code?: string;
  type?: ReminderType;
  subject?: string;           // Chủ đề
  customerId?: string | null;        // ID khách hàng
  customerName?: string;      // Tên khách hàng (để hiển thị nhanh)
  content?: string;           // Nội dung nhắc nhở
  // Các trường linh hoạt cho từng loại
  startDate?: string;         // Dùng cho cả 3 (Ngày cố định / Ngày bắt đầu / Ngày sinh)
  endDate?: string;          // Chỉ dùng cho RANGE
  birthday?: string;         // Chỉ dùng cho BIRTHDAY (lưu định dạng MM-DD)
  reminderTime?: string | null;     // Giờ nhắc (HH:mm)

  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt?: Date;
  createdBy?: number | string;
  updatedAt?: Date;
  updatedBy?: number | string;
  files?: FileInfo[];
  rate?: string;
  active?: boolean;
}
export interface IReminderFilter {
  createdAt?: Date | {
    $gte?: Date;
    $lte?: Date;
  } | null | string;
  createdBy?: number[] | null;      // Người tạo
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED' | null;
  type?: ReminderType | null;
  customerId?: string | null;        // ID khách hàng
}

export const ReminderTypeOptions = [
  { label: 'Cố định', value: 'FIXED' },
  { label: 'Theo giai đoạn', value: 'RANGE' },
  { label: 'Theo sinh nhật', value: 'BIRTHDAY' },
];

export const ReminderStatusOptions = [
  { label: 'Chờ xử lý', value: 'PENDING' },
  { label: 'Đã hoàn thành', value: 'COMPLETED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
];
