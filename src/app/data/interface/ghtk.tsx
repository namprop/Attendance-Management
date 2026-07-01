export interface GHTKProduct {
  name: string; // Tên hàng hóa (bắt buộc)
  price?: number; // Giá trị của sản phẩm (tính theo VND)
  weight: number; // Khối lượng hàng hóa (tính theo KG, bắt buộc)
  quantity?: number; // Số lượng hàng hóa (mặc định 1)
  product_code?: string | number // Mã sản phẩm (tùy chọn)
  height?: number; // Chiều cao (cm, tùy chọn)
  width?: number; // Chiều rộng (cm, tùy chọn)
  length?: number; // Chiều dài (cm, tùy chọn)
  cod?: number; // Giá trị thu hộ (tùy chọn)
  selectedQty?: number; // Số lượng tùy chỉnh (tùy chọn)
}

/**
 * Thông tin điểm lấy hàng (pickup)
 */
export interface GHTKPickInfo {
  pick_name: string;      // Tên người liên hệ lấy hàng
  pick_money: number;     // Tiền CoD (0 = không thu)
  pick_tel: string;       // SĐT liên hệ lấy hàng
  pick_ext_tel?: string;  // Số máy lẻ (tùy chọn)
  pick_email?: string;    // Email lấy hàng (tùy chọn)
  pick_address?: string;  // Địa chỉ lấy hàng (ngắn gọn)
  pick_province: string;  // Tỉnh/thành phố lấy hàng
  pick_district: string;  // Quận/huyện lấy hàng
  pick_ward?: string;     // Phường/xã lấy hàng
  pick_street?: string;   // Đường/phố lấy hàng
  pick_date?: string;     // Ngày lấy hàng (YYYY-MM-DD)
  pick_work_shift?: number; // Ca lấy hàng (1: Sáng, 2: Chiều, 3: Tối)
  deliver_work_shift?: number; // Ca giao hàng (1: Sáng, 2: Chiều, 3: Tối)
}

/**
 * Thông tin giao hàng (người nhận)
 */
export interface GHTKDeliveryInfo {
  name: string;           // Tên người nhận
  tel: string;            // SĐT người nhận
  ext_tel?: string;       // Số máy lẻ của người nhận
  email?: string;         // Email người nhận (tùy chọn)
  address: string;        // Địa chỉ chi tiết người nhận
  province: string;       // Tỉnh/thành phố người nhận
  district: string;       // Quận/huyện người nhận
  ward?: string;          // Phường/xã người nhận
  street?: string;        // Tên đường/phố người nhận (Bắt buộc khi không có hamlet)
  hamlet?: string;        // Thôn/ấp/xóm/tổ... người nhận (Bắt buộc khi không có street)
  note?: string;          // Ghi chú đơn hàng (<=120 ký tự)
}

/**
 * Thông tin trả hàng (return)
 */
export interface GHTKReturnInfo {
  use_return_address?: number; // 0: dùng địa chỉ lấy hàng, 1: dùng địa chỉ trả riêng
  return_name?: string;       // Tên người nhận hàng trả
  return_tel?: string;        // SĐT người nhận hàng trả
  return_email?: string;      // Email người nhận hàng hóa
  return_address?: string;    // Địa chỉ trả hàng
  return_province?: string;   // Tỉnh/thành phố trả hàng
  return_district?: string;   // Quận/huyện trả hàng
  return_ward?: string;       // Phường/xã trả hàng
  return_street?: string;     // Đường/phố trả hàng
}

/**
 * Các cấu hình bổ sung đơn hàng GHTK
 */
export interface GHTKOrderExtra {
  is_freeship?: number;       // 0: người nhận trả ship, 1: shop trả ship
  value: number;              // Giá trị khai giá (VNĐ)
  transport?: "road" | "fly"; // Phương thức vận chuyển (mặc định là "fly")
  pick_option?: "cod" | "post"; // cod: shipper lấy hàng, post: shop gửi bưu cục
  total_weight?: number;      // Tổng khối lượng
  total_box?: number;         // Tổng số kiện (BBS)
  length?: number;            // Chiều dài kiện hàng (cm)
  width?: number;             // Chiều rộng kiện hàng (cm)
  height?: number;            // Chiều cao kiện hàng (cm)
  gam_solutions?: {
    solution_id: number;
  }[];
  solutions?: number[];       // Danh sách ID các giải pháp (GHTK API mới)
}

/**
 * Thông tin đơn hàng GHTK tổng hợp (Payload gửi API)
 */
export interface GHTKOrderPayload extends GHTKPickInfo, GHTKDeliveryInfo, GHTKReturnInfo, GHTKOrderExtra {
  id: string; // Mã đơn hàng nội bộ
}

/**
 * Payload chính gửi sang GHTK
 */
export interface GHTKRequestBody {
  products: GHTKProduct[];
  order: GHTKOrderPayload;
}

/**
 * Response trả về từ GHTK
 */
export interface GHTKResponse {
  success: boolean;
  message: string;
  order?: {
    partner_id: string;
    label: string;
    area: string;
    fee: string;
    insurance_fee: string;
    tracking_id: number;
    estimated_pick_time: string;
    estimated_deliver_time: string;
    products: GHTKProduct[];
    status_id: number;
  };
  error?: {
    code: string;
    partner_id: string;
    ghtk_label: string;
    created: string;
    status: number;
  };
}

export interface GHTKCancelResponse {
  success: boolean;
  message: string;
  log_id: string;
}

export interface GHTKWebhookParams {
  partner_id?: number | string;
  label_id: string;
  status_id: GHTKStatusId;
  action_time?: string;
  reason_code?: string;
  reason?: string;
  weight?: number;
  fee?: number;
  pick_money?: number;
  return_part_package?: number;
}


/** 
 * Mã trạng thái đơn hàng GHTK
 */
export type GHTKStatusId = 
  | -1  // Hủy đơn hàng
  | 1   // Chưa tiếp nhận
  | 2   // Đã tiếp nhận
  | 3   // Đã lấy hàng/Đã nhập kho
  | 4   // Đã điều phối giao hàng/Đang giao hàng
  | 5   // Đã giao hàng/Chưa đối soát
  | 6   // Đã đối soát
  | 7   // Không lấy được hàng
  | 8   // Hoãn lấy hàng
  | 9   // Không giao được hàng
  | 10  // Delay giao hàng
  | 11  // Đã đối soát công nợ trả hàng
  | 12  // Đã điều phối lấy hàng/Đang lấy hàng
  | 13  // Đơn hàng bồi hoàn
  | 20  // Đang trả hàng (COD cầm hàng đi trả)
  | 21  // Đã trả hàng (COD đã trả xong hàng)
  | 123 // Shipper báo đã lấy hàng
  | 127 // Shipper (nhân viên lấy/giao hàng) báo không lấy được hàng
  | 128 // Shipper báo delay lấy hàng
  | 45  // Shipper báo đã giao hàng
  | 49  // Shipper báo không giao được giao hàng
  | 410 // Shipper báo delay giao hàng
  | (number & {}); // Fallback cho các mã khác nếu có

export const GHTK_STATUS_LABELS: Record<number, string> = {
  [-1]: "Hủy đơn hàng",
  [1]: "Chưa tiếp nhận",
  [2]: "Đã tiếp nhận",
  [3]: "Đã lấy hàng/Đã nhập kho",
  [4]: "Đang giao hàng",
  [5]: "Đã giao hàng/Chưa đối soát",
  [6]: "Đã đối soát",
  [7]: "Không lấy được hàng",
  [8]: "Hoãn lấy hàng",
  [9]: "Không giao được hàng",
  [10]: "Delay giao hàng",
  [11]: "Đã đối soát công nợ trả hàng",
  [12]: "Đang lấy hàng",
  [13]: "Đơn hàng bồi hoàn",
  [20]: "Đang trả hàng",
  [21]: "Đã trả hàng",
  [123]: "Shipper báo đã lấy hàng",
  [127]: "Shipper báo không lấy được hàng",
  [128]: "Shipper báo delay lấy hàng",
  [45]: "Shipper báo đã giao hàng",
  [49]: "Shipper báo không giao được hàng",
  [410]: "Shipper báo delay giao hàng",
};

/**
 * Helper function: Lấy thông tin hiển thị (Label & Màu sắc) dựa trên mã trạng thái GHTK
 */
export const getGHTKStatusStyle = (statusId?: GHTKStatusId | string | number) => {
  const sId = Number(statusId);
  const label = GHTK_STATUS_LABELS[sId] || "Không xác định";

  // Trạng thái thành công (Màu xanh lá)
  if ([5, 6, 11, 21, 45].includes(sId)) {
    return { label, className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  
  // Trạng thái đang xử lý bình thường (Màu xanh dương)
  if ([1, 2, 3, 4, 12, 20, 123].includes(sId)) {
    return { label, className: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  
  // Trạng thái hoãn / cảnh báo (Màu vàng/cam)
  if ([8, 10, 128, 410].includes(sId)) {
    return { label, className: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  
  // Trạng thái lỗi / hủy / hoàn (Màu đỏ)
  if ([-1, 7, 9, 13, 49, 127].includes(sId)) {
    return { label, className: "bg-rose-50 text-rose-700 border-rose-200" };
  }

  // Mặc định (Màu xám)
  return { label, className: "bg-gray-50 text-gray-700 border-gray-200" };
};

export interface GHTKFeeItem {
  name: string;
  amount: number;
  source?: string;
  title?: string;
}

export interface GHTKSolutionDetail {
  id: number;
  name: string;
  fee: number;
  delivery_time: string;
  solution_id?: number;
  solution_name?: string;
  extFees?: GHTKFeeItem[];
}

export interface GHTKOptionItem {
  option_id: number | string;
  option_name: string;
  fee: number | string;
  is_free: boolean;
}

export interface GHTKSolutionGroup {
  solution_id: number;
  solution_name: string;
  solutions?: GHTKSolutionDetail[];
  group_name?: string;
  options?: GHTKOptionItem[];
}

export interface GHTKShipmentProduct {
  full_name: string;
  product_code: string | number;
  quantity: number;
  weight: number;
}

export interface GHTKShipmentOrderDetail {
  status: number;
  status_text: string;
  pick_money: number;
  ship_money: number;
  weight: number;
  insurance: number;
  value: number;
  partner_id: string | number;
  label_id: string;
  created: string | Date;
  modified: string | Date;
  pick_date?: string | Date | null;
  deliver_date?: string | Date | null;
  customer_fullname?: string | null;
  customer_tel?: string | null;
  address?: string | null;
  storage_day?: number | null;
  is_freeship?: number;
  message?: string | null;
  products?: GHTKShipmentProduct[];
  _debug?: {
    url_called: string;
    client_used: string;
    token_start: string;
  };
}

