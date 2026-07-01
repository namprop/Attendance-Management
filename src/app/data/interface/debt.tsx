export interface Debt {
  id: string;             // Mã nhà cung cấp
  name: string;           // Tên nhà cung cấp
  debt: number;           // Số tiền còn nợ
  total: number;          // Tổng số tiền đã mua
  totalpurchase: number;  // Tổng số tiền đã thanh toán
  creator: string;        // Người tạo
  createDate: string;     // Ngày tạo
}
