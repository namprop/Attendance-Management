import { FileInfo } from "./file";

export interface CustomerCompanyInfo {
  id?: string;                        // uuid để identify
  personalOrCompany?: number | null;  // 1: Cá nhân, 2: Công ty, 3: HKD
  companyName?: string | null;        // Tên công ty/Hộ kinh doanh
  taxCode?: string | null;            // Mã số thuế
  isDefault?: boolean;                // Đây là bản ghi mặc định
  email?: string | null;              // Email liên hệ
  phone?: string | null;              // Số điện thoại liên hệ
  address?: string | null;            // Địa chỉ liên hệ
}


export interface CustomerAddress {
  id: string;                       // uuid để identify
  label?: string;                   // Nhãn: Nhà riêng, Văn phòng, Kho, ...
  address: string;                  // Địa chỉ đầy đủ
  isDefault?: boolean;              // Địa chỉ mặc định
  area?: string | null;             // Khu vực
  province?: number | null; // Tỉnh/Thành phố
  district?: string | number | null; // Quận/Huyện
  ward?: number | null;             // Phường/Xã
}

export interface Customer {
  [key: string]: unknown;
  id?: string;             // Mã khách hàng
  name?: string;           // Tên khách hàng
  phone?: string;          // Số điện thoại
  email?: string;         // Email
  address?: string;       // Địa chỉ
  group?: string;         // Nhóm khách hàng (khách đại lý,có sẵn,sản xuất)
  status?: string | number; // Trạng thái (hoạt động, không hoạt động)

  createdAt?: string;      // Ngày tạo
  createdBy?: string;      // Người tạo
  createdByName?: string;      // Người tạo
  updatedAt?: string;      // Ngày cập nhật
  updatedBy?: string;      // Người cập nhật
  updatedByName?: string;      // Người cập nhật

  credibility?: string | null; // Độ tin cậy
  credibilityScore?: number | null; // Điểm uy tín (0-100)
  totalInvoiceCount?: number | null; // Tổng số hóa đơn
  canceledInvoiceCount?: number | null; // Tổng số hóa đơn hủy
  warningCanceledInvoiceCount?: number | null; // Số hóa đơn hủy bị cảnh báo

  note?: string;          // yêu cầu khách hàng
  area?: string | null;           // khu vực
  zalo?: string | null;   //zalo
  page?: string | null;  //facebook
  segment?: string | null;
  productgroup?: string | null | number[] | string[];
  consultant?: string | null;
  consultantSub?: string | null | number[] | string[];
  customerstatus?: string | null;
  customerorigin?: string | null;
  rate?: string

  productSource?: string | null;
  customertype?: string | null;
  purchaseStatus?: string | null;
  customerProvince?: number | null;
  ward?: number | null;
  avatar?: string | null;
  gender?: string | null;
  birthday?: string | null;
  personalOrCompany?: number | null;

  taxCode?: string | null;
  companyName?: string | null;

  fileInvoiceTemp?: FileInfo[]; // file hóa đơn lưu tạm
  addresses?: CustomerAddress[]; // Danh sách địa chỉ
}

export type CancelReasonRisk = "safe" | "warning";
export type CancelReasonGroup = "customer" | "operation";

export interface CancelReasonOption {
  id: string;
  label: string;
  risk: CancelReasonRisk;
  group: CancelReasonGroup;
}

// Data fake lý do hủy đơn để chọn trên modal và tính độ uy tín khách hàng.
export const CANCEL_REASON_OPTIONS: CancelReasonOption[] = [
  // Lỗi của khách → ảnh hưởng uy tín khách
  { id: "customer_wrong_size", label: "Khách đặt nhầm kích thước hộp carton", risk: "warning", group: "customer" },
  { id: "customer_wrong_qty", label: "Khách đặt nhầm số lượng cần mua", risk: "warning", group: "customer" },
  { id: "customer_change_need", label: "Khách thay đổi nhu cầu sử dụng", risk: "warning", group: "customer" },
  { id: "customer_change_model", label: "Khách muốn đổi sang loại hộp carton khác", risk: "warning", group: "customer" },
  { id: "duplicate_order", label: "Đơn hàng bị trùng do khách đặt nhiều lần", risk: "warning", group: "customer" },
  { id: "customer_other_supplier", label: "Khách tìm được nhà cung cấp khác phù hợp hơn", risk: "warning", group: "customer" },
  { id: "wrong_address_unreachable", label: "Địa chỉ giao hàng bị sai hoặc không liên hệ được khách", risk: "warning", group: "customer" },
  // Lỗi của shop → không trừ uy tín khách
  { id: "price_or_shipping_not_fit", label: "Giá sản phẩm hoặc phí vận chuyển chưa phù hợp", risk: "safe", group: "operation" },
  { id: "delivery_time_not_fit", label: "Thời gian giao hàng không đáp ứng được yêu cầu", risk: "safe", group: "operation" },
  { id: "out_of_stock_or_no_sample", label: "Hàng không còn đủ số lượng hoặc không có sẵn mẫu theo yêu cầu", risk: "safe", group: "operation" },
  { id: "shop_report_out_of_stock", label: "Shop báo hết hàng sau khi khách đặt", risk: "safe", group: "operation" },
  { id: "shop_confirm_late", label: "Shop không xác nhận đơn kịp", risk: "safe", group: "operation" },
  { id: "shop_prepare_late", label: "Shop không chuẩn bị hàng đúng hạn", risk: "safe", group: "operation" },
  { id: "shop_wrong_product_info", label: "Shop sai thông tin sản phẩm/kích thước", risk: "safe", group: "operation" },
  { id: "shop_ask_cancel", label: "Shop yêu cầu khách hủy vì không muốn bán", risk: "safe", group: "operation" },
  { id: "product_not_as_commitment", label: "Sản phẩm lỗi/không đúng cam kết", risk: "safe", group: "operation" },
  { id: "ghtk_auto_cancel", label: "GHTK tự động hủy/hoàn hàng", risk: "safe", group: "operation" },
];



export interface CustomerFilter {
  createdAt?: Date | {
    $gte?: Date;
    $lte?: Date;
  } | null | string;
  createdBy?: string | null;      // Người tạo

  group?: string | null;         // Nhóm khách hàng (khách đại lý,có sẵn,sản xuất)
  status?: string | number | null; // Trạng thái (hoạt động, không hoạt động)
  area?: string | null;           // khu vực
  zalo?: string | null;   //zalo
  page?: string | null;  //facebook
  segment?: string | null;
  productgroup?: string | null | number[] | string[];
  consultant?: string | null;
  consultantSub?: string | null | number[] | string[];
  customerstatus?: string | null;
  customerorigin?: string | null;
  productSource?: string | null;
  customertype?: string | null;
  purchaseStatus?: string | null;
  customerProvince?: string | null;
  ward?: string | null;
  gender?: string | null;
  birthday?: Date | {
    $gte?: Date;
    $lte?: Date;
  } | null | string;
}

export interface Project {
  [key: string]: unknown;
  nameProject?: string; // Tên dự án
  titleProject?: string; // Tiêu đề dự án
  id?: string; // Mã dự án
  customerId?: string; // Mã khách hàng
  createdBy?: string; // Người tạo
  createdAt?: string; // Ngày tạo
  updatedAt?: string // Ngày cập nhật
  status?: 'PENDING' | 'CANCELLED' | 'CLOSED' | 'TERMINATE' | 'CARE' | string; // Trạng thái: Chưa chốt, Không chốt, Chốt đơn,Hủy chốt đơn
  evaluate?: string; // Đánh giá
  tags?: Tags[]; // Thẻ dự án
  fileProject?: FileInfo[]; // Danh sách file dự án
  active?: string;
}
export interface Tags {
  [key: string]: unknown;
  id?: string;
  nameTags?: string;
  color?: string;
  type?: string;
}
