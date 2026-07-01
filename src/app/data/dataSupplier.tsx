export interface Supplier {
  [key: string]: unknown;
  id?: string;
  name?: string; // Tên nhà cung cấp
  phone?: number | string; // Số điện thoại
  email?: string; // Email 
  address?: string; // Địa chỉ 
  company?: string; // Tên công ty
  note?: string; // Ghi chú
  taxcode?: number; // Mã số thuế
  creator?: string; // Người tạo
  createDate?: string; // Ngày tạo
  status?: string; // Trạng thái (Đang hoạt động, Ngừng hoạt động)
  
  area?: string; // Khu vực
  city?: string; // Thành phố
  wards?: string; // Phường/Xã
}
