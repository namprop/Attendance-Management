import { Product } from "./product";
import { Mold } from "../dataMold";
import { FileInfo } from "./file";
import { BalanceHistory } from "../dataUser";
import { Option } from "@/app/data/productType";
import { CustomerAddress } from "./customer";
import { GHTKProduct, GHTKFeeItem } from "./ghtk";

// phôi
export interface PaperProducts {
  [key: string]: unknown
  code?: string;
  name?: string;
  nameProduct?: string | null;
  location?: string | null;
  typebox?: string | null;
  long?: number;
  width?: number;
  height?: number;
  size?: string | null;
  idSupplier?: number | null;
  longPhoi?: number;
  widthPhoi?: number;
  acreage?: number;
  selectedType?: number | null;
  selectedWave?: string | null;
  selectedColor?: string | null;
  selectedPrice?: number | null;
  selectedQuantitative?: string | null; // định lượng

  idStage?: number; // công đoạn sản xuất
  sizeMoldKnife?: { // kích thước dao khuôn bế
    long?: number;
    width?: number;
  };
  bowls?: number; // số bát
  stripesWidth?: number; // chiều rộng đường kẻ lằn khi chọn công đoạn bổ
  typeStripesWidth?: number | null; // loại lằn
  dataMold?: Mold | null;

  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
  note?: string;

  // TH dành cho hộp 2 mảnh
  idParent?: string | null; // id của đơn cha (nếu đây là 1 mảnh trong đơn 2 mảnh)
  parts?: PaperProducts[];     // nếu đây là đơn cha thì chứa danh sách các mảnh con

  codeProduct?: string | null; // mã sản phẩm
  idProduct?: string | null; // mã liên kết sản phẩm

  selectedQty?: number; // số lượng tùy chỉnh
}

export interface FeeHistoryItem {
  id: string;                    // ID riêng của khoản thu khác
  feeId: string;                 // ID loại phí
  type: string;                  // Tên loại phí
  amount: number;
  method: "cash" | "transfer";
  reference: string;             // người thu / tài khoản nhận
  date: string;
  files?: FileInfo[];
  idTransaction?: string;        // ← Quan trọng nhất
  createdBy?: number;
  createdByName?: string;
}

export interface ExpenseHistoryItem {
  id: string;
  expenseId: string;
  type: string;
  amount: number;
  method: "cash" | "transfer";
  reference: string;
  date: string;
  files?: FileInfo[];
  idTransaction?: string;
  createdBy?: number;
  createdByName?: string;
}

export interface IncomeExpense {
  id?: string;
  money?: number;
  name?: string;
  isVat?: boolean
}

export interface FlexibleFeeItem {
  id?: string;
  _id?: string | { $oid: string };
  code?: string;
  money?: number;
  value?: number;
  name?: string;
  isVat?: boolean;
}

/** Loại trạng thái đóng gói/giao hàng khi hủy đơn */
export type CancelPackingStatus =
  | "not_packed"           // Chưa đóng hàng
  | "packed_not_delivered" // Đã đóng nhưng chưa giao
  | "packed_delivered";    // Đã đóng và đã giao cho khách

/** Thông tin kiểm hàng từng sản phẩm khi hủy đơn đã giao */
export interface CancelStockInspectionItem {
  productId: string;
  productName: string;
  totalQty: number;   // Tổng số lượng trong đơn
  goodQty: number;    // Hàng đẹp → hoàn kho bình thường
  badQty: number;     // Hàng xấu → tạo lệnh thanh lý
  damagedQty: number; // Hàng hỏng → tạo lệnh xuất hủy
  usageQty?: number;  // Hàng xuất sử dụng → tạo lệnh xuất sử dụng
}

/** Snapshot kiểm hàng lưu vào invoice khi pending phê duyệt */
export interface CancelStockInspection {
  packingStatus: CancelPackingStatus;
  items?: CancelStockInspectionItem[];
}

/** Payload đầy đủ khi xác nhận hủy đơn (từ modal đa bước) */
export interface CancelConfirmPayload {
  reason: import("./customer").CancelReasonOption;
  packingStatus: CancelPackingStatus;
  stockInspection?: CancelStockInspectionItem[];
  deleteTransactions?: boolean;
}

export interface InvoicePayment {
  _id?: unknown;
  invoiceId?: string;
  kiotInvoiceId?: number;
  paymentId?: number;
  paymentCode?: string;
  amount?: number;
  method?: string;
  methodNormalized?: string;
  status?: number;
  statusValue?: string;
  accountId?: number;
  bankAccount?: string;
  description?: string;
  transDate?: string;
  source?: "KIOT_WEBHOOK";
  saleChannel?: string;
  branchId?: string;
  customerName?: string;
  isDeleted?: boolean;
  raw?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface KiotInvoiceDetail {
  ProductId: number;
  ProductCode: string;
  ProductName: string;
  Quantity: number;
  Price: number;
  Discount: number;
  SubTotal: number;
  Note?: string;
  ProductBatchId?: number;
  BatchName?: string;
  ExpiryDate?: string;
}

export interface KiotInvoiceDelivery {
  DeliveryCode: string;
  ServiceCode?: string;
  Price?: number;
  Status: number;
  StatusValue: string;
  PartnerId?: number;
  PartnerName?: string;
  ExpectedDeliveryDate?: string;
}

export interface KiotPayment {
  Method: string;
  MethodName: string;
  Amount: number;
  TransDate?: string;
  PaymentCode?: string;
}

export interface KiotData {
  Id: number;
  Code: string;
  PurchaseDate: string;
  BranchId: number;
  BranchName: string;
  SellerId: number;
  SellerName: string;
  CustomerId: number;
  CustomerCode: string;
  CustomerName: string;
  Total: number;
  TotalPayment: number;
  Status: number;
  StatusValue: string;
  SaleChannelId?: number;
  SaleChannelName?: string;
  InvoiceDetails: KiotInvoiceDetail[];
  InvoiceDelivery?: KiotInvoiceDelivery;
  Payments: KiotPayment[];
  ModifiedDate: string;
}

export interface PaymentSummary {
  totalPaid: number;
  remainingAmount: number;
  paymentCount: number;
  hasSplitPayment: boolean;
  paymentStatus: string;
  methods: string[];
  latestPaymentDate?: string;
}

export interface InfoOrderData {
  [key: string]: unknown;
  id?: string;
  idInvoiceLink?: string[]; // ID hóa đơn sx liên kết

  // === QUẢN LÝ TÁCH ĐƠN (SPLIT INVOICE) ===
  parent_invoice_id?: string;    // Lưu ID hóa đơn cha (Dành cho đơn con)
  child_invoice_ids?: string[];  // Mảng lưu danh sách ID các đơn con (Dành cho đơn cha)
  is_split_parent?: boolean;     // Đánh dấu đây là đơn cha đã thực hiện tách đơn
  split_count?: number;          // Số thứ tự để đánh mã .1, .2 (tránh trùng lặp)
  packages?: PackageData[];      // Lưu cấu hình các kiện hàng đang chờ tách
  total_cod_amount?: number;     // Tổng tiền COD từ tất cả các kiện
  total_package_value?: number;  // Tổng giá trị hàng hóa từ tất cả các kiện

  kiotData?: KiotData; // Dữ liệu gốc từ KiotViet
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  seller?: string;
  rowaddress?: string; //địa chỉ lấy hàng
  cod?: number;
  codAmount?: number;
  note?: string;
  notestotal?: string[];
  quote?: string;
  orderDateTime?: string;
  totalDue?: number;
  discount?: number;
  totalProduct?: number;
  customerAddress?: CustomerAddress[] | string;
  items: Product[]; // sản phẩm
  ghtk_items?: (GHTKProduct | PackageData)[]; // sản phẩm GHTK payload
  itemsPaper?: PaperProducts[]; // phôi
  idcustomer?: string;
  saleschanel?: string;
  customerchange?: number;
  vatType?: "percent" | "vnd";
  discountType?: "vnd" | "percent";

  dateInvoice?: string;
  deliveryDate?: string; // ngày hẹn giao

  invoicetype?: string;
  createdBy?: number;
  createdByName?: string;
  updatedAt?: string; //ngày cập nhật giao dịch
  updateBy?: number; // id người cập nhật
  updateByName?: string; //tên người cập nhật
  statusInvoice?: string
  cancelReasonId?: string; // Mã lý do hủy đơn
  cancelReason?: string; // Nội dung lý do hủy đơn
  cancelReasonRisk?: "safe" | "warning"; // Nhóm ảnh hưởng uy tín
  cancelReasonGroup?: "customer" | "operation"; // Nhóm lý do

  extraFee?: number;
  selectedFeeIds?: (string | FlexibleFeeItem | IncomeExpense)[];
  feeCustomValues?: Record<string, number>;

  expenses?: number;
  selectedExpenseIds?: IncomeExpense[];
  expenseCustomValues?: Record<string, number>;

  otherIncomeMethod?: "cash" | "transfer";
  otherIncomePerson?: string;
  otherIncomeAccount?: string;
  otherIncomeAccountId?: string; // <--- Thêm dòng này

  expenseMethod?: "cash" | "transfer";
  expensePerson?: string;
  expenseAccount?: string;
  expenseAccountId?: string;

  paymentMethod?: "cash" | "transfer";
  paymentPerson?: string; // Lưu tên người nộp tiền (nếu là tiền mặt)
  paymentAccount?: string; // Lưu tên tài khoản (nếu là chuyển khoản)

  refundMethod?: "cash" | "transfer";
  refundPerson?: string;
  refundAccount?: string;

  paymentHistory?: PaymentHistoryItem[];
  feePaymentHistory?: PaymentHistoryItem[]; // <-- Lịch sử thu khác
  expensePaymentHistory?: PaymentHistoryItem[]; // <-- Lịch sử chi khác
  companyExpenseAmount?: number; // Tổng chi phí công ty riêng
  companyExpenseDetails?: { id?: string; name?: string; amount?: number }[]; // Danh sách phí công ty riêng
  companyExpensePaymentHistory?: PaymentHistoryItem[]; // Lịch sử chi phí công ty riêng
  refundPaymentHistory?: PaymentHistoryItem[]; // lịch sử trả lại khách

  typeCustormer?: string, // phân loại kh
  dealerLevel?: string, // cấp đại lý
  typeInvoice?: string, // phân loại hóa đơn
  branch?: string, // kho hàng

  typedelivery?: string, // loại giao hàng
  typeShipper?: string, // loại người giao hàng
  shipper?: Shipper[], // người giao hàng nội bộ
  shipperOut?: Shipper[], // người giao hàng ngoài
  ghtkShipper?: Shipper[]; // GHTK

  typedeliveryStatus?: string; // trạng thái giao hàng
  typeTransaction?: string; // trạng thái thanh toán
  typeTicket?: boolean; //trạng thái phiếu
  idTicket?: string | null; // id phiếu thanh toán

  billpayment?: string[],  // phương thức thanh toán
  fileInvoice?: FileInfo[] // ảnh thanh toán

  trackingnumber?: string // mã vận đơn
  trackingstatus?: string // trạng thái vận đơn

  // GHTK & Shipping extra fields
  transport?: "road" | "fly" | "road_bbs";
  pick_date?: string;
  deliver_date?: string;
  pick_work_shift?: number;
  deliver_work_shift?: number;
  pick_option?: "cod" | "post";
  solutions?: number[];
  ghtkActualFee?: number;
  totalExtraFeeAmount?: number;
  ghtkFeeLoss?: boolean | string;
  dynamicFeeLoss?: boolean | string;
  isGiaoHangTietKiem?: boolean;
  isFromKiot?: boolean;
  isHanoiSaigon?: boolean;
  package_length?: number;
  package_width?: number;
  package_height?: number;
  total_weight?: number;
  total_box?: number;
  is_freeship?: number;
  is_collect?: boolean;
  sumPrice?: number;
  pick_name?: string;
  pick_tel?: string;
  pick_address?: string;
  pick_province?: string;
  pick_district?: string;
  pick_ward?: string;
  pick_street?: string;
  hamlet?: string;
  ghtk_note?: string;
  use_return_address?: number;
  return_name?: string;
  return_tel?: string;
  return_address?: string;
  return_province?: string;
  return_district?: string;
  return_ward?: string;
  return_street?: string;
  return_email?: string;
  value?: number;

  customerProvince?: string // thành phố
  ward?: string // xã
  area?: string // miền

  isShipping?: boolean;
  location?: string;
  lots?: Lots[]; // lô hàng
  idQuote?: QuoteItem[]; // id báo giá (nếu có)
  payments?: InvoicePayment[];
  paymentSummary?: PaymentSummary;
  totalPayment?: number;

  pushToGHTK?: boolean;
  ghtkLabel?: string;        // lưu nhãn vận đơn GHTK (nếu đẩy thành công)
  ghtkTrackingId?: number;   // tracking_id từ GHTK (tùy chọn)
  ghtkStatus?: string | number; // trạng thái gốc từ GHTK

  fileInvoiceRed?: FileInfo[] // file hóa đơn đỏ
  linkInvoiceRed?: string // link file hóa đơn đỏ

  approve?: boolean; // trạng thái duyệt
  approveBy?: number; // id người duyệt
  approveByName?: string; // tên người duyệt
  approveAt?: string; // ngày duyệt

  approveEdit?: boolean; // trạng thái duyệt sửa/xóa
  approveEditBy?: number; // id người duyệt sửa/xóa
  approveEditByName?: string; // tên người duyệt sửa/xóa
  approveEditAt?: string; // ngày duyệt sửa/xóa

  invoiceEdit?: InfoOrderData[]; // Dữ liệu hóa đơn sửa

  action?: boolean;
  lockSessionId?: string;
  isUnlockedForEdit?: boolean;

  isDeleted?: boolean;
  deleteAt?: string;
  deletedBy?: number;
  deletedByName?: string;

  vatPercent?: number; // Thêm % VAT tự thiết lập
  vatAmount?: number; // Thêm số tiền VAT tính được

  unlockRequestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  unlockReason?: string;
  cancelRequestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  cancelRequestReasonId?: string;
  cancelRequestReason?: string;
  cancelRequestReasonRisk?: "safe" | "warning";
  cancelRequestReasonGroup?: "customer" | "operation";
  cancelRequestedAt?: string;
  cancelRequestedBy?: number;
  cancelRequestedByName?: string;

  // ── EXCHANGE (Đổi Trả Hàng) ──────────────────────────────────────────
  exchangeRequestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  exchangeRequestReasonId?: string;   // mã lý do đổi trả
  exchangeRequestReason?: string;     // nội dung lý do
  exchangeRequestedAt?: string;       // thời gian tạo yêu cầu
  exchangeRequestedBy?: number;       // id người tạo yêu cầu
  exchangeRequestedByName?: string;   // tên người tạo yêu cầu

  isExchanging?: boolean;             // lock chống double execute
  exchangeLockedAt?: string;
  exchangeLockedBy?: number;
  exchangeLockedByName?: string;

  exchangeGroupId?: string;           // ID nhóm 3 đơn (VD: EXG202605110001)
  originalInvoiceId?: string;         // đơn A gốc — dùng trên đơn B và C
  linkedReturnInvoiceId?: string;     // đơn B hoàn hàng — dùng trên đơn A
  linkedExchangeInvoiceId?: string;   // đơn C đổi mới — dùng trên đơn A
  // ─────────────────────────────────────────────────────────────────────

  revisionCount?: number;

  isPrintedCustomer?: boolean;
  isPrintedInternal?: boolean;
  warningPrintedCustomer?: boolean;
  warningPrintedInternal?: boolean;
  isUpdateHandled?: boolean;
  urgencyLevel?: string; // Bình thường | Gấp | Rất gấp
  isStarred?: boolean;

  idTaskRedInvoice?: string | null; // CV Hóa đơn đỏ liên kết với hóa đơn
  idPaymentTicketTask?: string | null; // phiếu TT chứa HĐ này đã liên kết CV HĐ đỏ
  checkMoney?: boolean; // Trạng thái kiểm tra tiền (đã kiểm tra hay chưa)
  salesHoldMoneyPaid?: boolean | null; // Sales cầm tiền đã trả: null/true = đã trả, false = chưa trả
  shipHoldMoneyPaid?: boolean | null; // Ship cầm tiền đã trả: null/true = đã trả, false = chưa trả
}


export interface Shipper {
  nameShipper?: string, // tên người giao hàng
  moneyShip?: number, // tiền giao hàng
  fileShip?: FileInfo[], // file giao hàng
  description?: string // ghi chú
}

export interface QuoteItem {
  idQuote?: string;
  idProduct?: string;
}

export interface Lots {
  id?: string; // id lô hàng (code, vd: LN00001)
  importId?: string; // importId gốc từ Product_BranchLots để hoàn trả đúng lô
  idProduct?: string; // id sản phẩm
  idBranch?: string;  // id chi nhánh
  quantity?: number; // số lượng bán trong lô
  price?: number; // giá vốn trong lô
  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
  updatedAt?: string;
  updatedBy?: number;
  updatedByName?: string;
}

export interface PaymentHistoryItem {
  id?: string;             // ID riêng của lần thanh toán này (nếu cần)
  date: string;            // Ngày giờ thanh toán
  amount: number;          // Số tiền
  method: "cash" | "transfer"; //Loại thanh toán
  reference?: string;      // Tên người nhận tiền hoặc Tên tài khoản ngân hàng
  note?: string; // Ghi chú (nếu cần)
  createdBy?: number;        // người tạo
  createdByName?: string;    // tên người tạo
  files?: FileInfo[]; // thanh toan
  idTransaction?: string; // mã giao dịch
  typeCategory?: 'payment' | 'fee' | 'expense' | "refund"; // Phân loại lịch sử
  feeType?: string; // Lưu tên loại phí/chi phí (vd: Phí vận chuyển)
}

export interface Transactions {
  [key: string]: unknown;
  id?: string;  // id giao dịch
  tradingDay?: string; // ngay giao dich (thuc te), format YYYY-MM-DD HH:mm
  moneyReceived?: number; // số tiền nhận
  moneySpent?: number; // số tiền chi
  typeTransaction?: string; // loại giao dịch(ck,tm)
  reason?: string; // Nội dung giao dịch
  target?: string; // giao dịch nội bộ ,giao dịch công ty
  noteTransaction?: string; // ghi chú giao dịch

  idAccount?: string | number; // id bank ,người thu chi
  nameAccount?: string; //tên bank hoặc tên user

  sender?: string; //người/tài khoản gửi
  receiver?: string; //người/tài khoản nhận
  note?: string; //ghi chú thêm
  deposit?: boolean; //nạp tiền hay rút tiền

  moneyTransaction?: number; //số tiền giao dịch(chờ phê duyệt)
  approve?: boolean; //trạng thái phê duyệt
  approveBy?: number; //id người phê duyệt
  approveByName?: string; //tên người phê duyệt
  approveAt?: string; //ngày phê duyệt
  action?: 'Delete' | 'Update' | null; // action giao dịch
  draftData?: Partial<Transactions>;

  incomeCategories?: string //các loại thu
  expenseCategories?: string //các loại chi
  subCategory?: string; // Hạng mục con (Chi tiết)

  fileTransfer?: FileInfo[]; // bill thanh toán or chụp tiền mặt

  createdAt?: string; //ngày tạo giao dịch
  updatedAt?: string; //ngày cập nhật giao dịch
  createBy?: number; // id người tạo
  updateBy?: number; // id người cập nhật
  createByName?: string; // tên người tạo
  updateByName?: string; //tên người cập nhật

  balance?: Balance; //số dư tk sau giao dịch  
  location?: string;
  historyId?: string;

  targetType?: string; // Giao dịch từ đâu
  idInvoice?: string
  targetInvoice?: string;

  isDeleted?: boolean;
  deleteAt?: string;
  deletedBy?: number;
  deletedByName?: string;

  seller?: string; // tên người bán
}

export interface Balance {
  id?: string;
  idAccount?: string;
  nameAccount?: string;
  balance?: number;
  note?: string;
  createdAt?: string;
}

export interface AccountBank {
  [key: string]: unknown;
  monney?: number; // số dư tài khoản
  nameAccount?: string; // tên tài khoản
  name?: string, // tên chủ tài khoản
  accountnumber?: string, // số tài khoản
  bank?: string // tên ngân hàng

  accountholder?: number; // chủ tài khoản
  accountholderName?: string; // tên chủ tài khoản
  idUser?: string[]; // danh sách user được phép truy cập
  branch?: string // chi nhánh
  location?: string

  createdAt?: number; //ngày tạo
  updatedAt?: string;//ngày cập nhật
  createdBy?: string;// người tạo
  updatedBy?: string;// người cập nhật
  createrName?: string;// tên người tạo
  updaterName?: string;// tên người cập nhật
  dailyBalances?: BalanceHistory[]; //số tiền ngày


  targetType?: string; // phân loại tk
}

export interface Ticket {
  [key: string]: unknown;
  id?: string;
  type?: string; //loại phiếu (vay,nợ,góp vốn)
  amount?: number; //số tiền vay/nợ/góp vốn
  reason?: string; //lý do lập phiếu
  note?: string; //ghi chú thêm

  Owner?: string; //người cho vay/nợ/góp vốn

  idAccount?: string | number; // id bank/ngời thu chi
  nameAccount?: string; //tên bank/người thu chi

  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
  updatedAt?: string;
  updatedBy?: number;
  updatedByName?: string;

  fileTransfer?: FileInfo[]; //file đính kèm

  loanterm?: string; //kỳ hạn vay/nợ
  loandate?: string; //Ngày bắt đầu vay/nợ
  interestRate?: number; //lãi suất

  interestAmount?: number; //số tiền lãi 1 năm
  interestAmountMonth?: number; //số tiền lãi 1 tháng
  interestAmountDay?: number; //số tiền lãi 1 ngày

  totaldebt?: number; //tổng nợ gốc + lãi
  totaldebtMonth?: number; //tổng nợ gốc + lãi 1 tháng
  totaldebtDay?: number; //tổng nợ gốc + lãi 1 ngày

  location?: string;
}


export interface SalesChanel {
  [key: string]: unknown;
  id?: string;
  name?: string;
}
export interface FeeExpenseItem {
  [key: string]: unknown;
  id?: string;              // Mã định danh riêng (VD: THK000001, CP001)
  name?: string;            // Tên khoản (VD: Phí Ship, Tiền điện)
  value?: number;           // Giá trị tiền
  moneyRecommend?: number[]  // Giá trị tiền gợi ý
  targetType?: string; // phân loại chi phí
  children?: FeeExpenseItem[]; // <--- MỚI: Danh sách các hạng mục con (VD: [{name: 'Xăng'}, {name: 'Sửa xe'}])

}
export const optionTransaction = [
  { label: "Chuyển khoản", value: 1 },
  { label: "Tiền mặt", value: 2 },
]

export interface Owner {
  [key: string]: unknown;
  id?: string;
  name?: string;
  cash?: number;
  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
  updatedAt?: string;
  updatedBy?: number;
  updatedByName?: string;
}

export interface PaymentTicket {
  [key: string]: unknown;
  id?: string; // mã phiếu thanh toán

  // Danh sách hóa đơn
  invoices: InfoOrderData[];

  // Tổng hợp
  totalInvoiceAmount?: number; // tổng tiền các hóa đơn
  totalPaid?: number;          // tổng đã thanh toán
  totalRemain?: number;        // còn lại

  // Thông tin khách (có thể lấy từ invoice hoặc riêng)
  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  // Thông tin thanh toán
  paymentMethod?: "cash" | "transfer" | "multiple";

  // Trạng thái
  typeTicket?: string;

  // Lịch sử thanh toán
  paymentHistory?: PaymentHistoryItem[];

  // --- CÁC TRƯỜNG LƯU THU KHÁC & PHÍ CHI ---
  extraFeeDetails?: { id?: string; name?: string; amount?: number }[];
  expenseDetails?: { id?: string; name?: string; amount?: number }[];
  totalExtraFee?: number;
  totalExpenses?: number;
  companyExpenseAmount?: number;
  companyExpenseDetails?: { id?: string; name?: string; amount?: number }[];
  companyExpensePaymentHistory?: PaymentHistoryItem[];

  // Ghi chú
  note?: string;
  fileTransfer?: FileInfo[];

  // Metadata
  createdAt?: string;
  createdBy?: number;
  createdByName?: string;

  updatedAt?: string;
  updatedBy?: number;
  updatedByName?: string;

  approved?: boolean;
  approvedAt?: string;
  approvedBy?: number;
  approvedByName?: string;

  paymentTicketEdit?: PaymentTicket[];
  paymantTicketDelete?: PaymentTicket[];

  lockSessionId?: string;
  isUnlockedForEdit?: boolean;
  unlockRequestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  unlockReason?: string;

  location?: string;
  branch?: string;

  isDeleted?: boolean;
  deleteAt?: string;
  deletedBy?: number;
  deletedByName?: string;

  idTaskRedInvoice?: string | null; // CV Hóa đơn đỏ liên kết với phiếu thanh toán
  paymentPerson?: string;
  paymentAccount?: string;
  splitByInvoiceId?: Record<string, number>;
}

// khóa sổ
export interface LockSession {
  _id?: unknown;
  id?: string;
  branchId?: string; // ID chi nhánh/kho hàng
  name?: string;     // Tên kỳ khóa (vd: Khóa sổ tháng 10)

  lockType?: "DATE_RANGE" | "UP_TO_DATE" | "MANUAL";
  startDate?: string; // Dạng ISO String
  endDate?: string;   // Dạng ISO String

  isActive?: boolean; // Nút Bật/Tắt khóa sổ

  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
}

export interface InvoiceManufacture {
  [key: string]: unknown;
  id?: string;
  items?: Product[];
  idProduct?: string;
  idMold?: string;
  idMaket?: string;
  idQuote?: string;
  location?: string;
  branch?: string;
  idInvoiceLink?: string; // id hóa đơn bán hàng liên kết

  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: CustomerAddress[] | string;

  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
  updatedAt?: string;
  updatedBy?: number;
  updatedByName?: string;
  deleteAt?: string;
  deletedBy?: number;
  deletedByName?: string;
  isDeleted?: boolean;

  dateInvoice?: string;
  closingDate?: string;
  customerPickupDate?: string;

  isPrint?: boolean;
  statusManufacture?: string;
  isMaket?: string;
  isRunning?: string;

}


export const typeCustormer: Option[] = [
  { label: "Khách cũ", value: "1" },
  { label: "Khách mới", value: "2" },
];

export const dealerLevel: Option[] = [
  { label: "Giá lẻ - TK 11", value: "1" },
  { label: "Giá sỉ - TK 12", value: "2" },
  { label: "Giá Đại lý Cấp 1 - TK 13", value: "3" },
  { label: "Giá Đại lý Cấp 2 - TK 14", value: "4" },
  { label: "Giá Đại lý Cấp 3 - TK 15", value: "5" },
  { label: "Giá Đại lý Cấp 4 - TK 16", value: "6" },
  { label: "Giá Đại lý Cấp 5 - TK 17", value: "7" },
  { label: "Giá Đại lý Cấp 6 - TK 18", value: "8" },
  { label: "Giá Đại lý Cấp 7 - TK 19", value: "9" },
];

export const typedelivery: Option[] = [
  { label: "Giao hàng thường", value: "1" },
  { label: "Giao hàng nhanh", value: "2" },
  { label: "Đơn bookship", value: "3" },
  { label: "Giao hàng tiết kiệm ", value: "4" },
  { label: "Tới lấy", value: "5" },
];

export const typeShipper: Option[] = [
  { label: "Shipper ngoài", value: "1" },
  { label: "Shipper nội bộ", value: "2" },
]

export const fakeTypeProducts: Option[] = [
  { label: "Hóa đơn sản xuất", value: "1" },
  { label: "Hóa đơn hàng có sẵn", value: "2" },
  { label: "Hóa đơn cả sx và có sẵn", value: "3" },
];

export const typedeliveryStatus: Option[] = [
  { label: "Chờ xử lý", value: "1" },
  { label: "Đang lấy hàng", value: "2" },
  { label: "Chờ lấy lại", value: "3" },
  { label: "Đã lấy hàng", value: "4" },
  { label: "Đang giao hàng", value: "5" },
  { label: "Chờ giao lại", value: "6" },
  { label: "Giao thành công", value: "7" },
  { label: "Chờ chuyển hoàn", value: "8" },
  { label: "Đang chuyển hoàn", value: "9" },
  { label: "Chờ chuyển hoàn lại", value: "10" },
  { label: "Đã chuyển hoàn", value: "11" },
  { label: "Đã hủy", value: "12" },
  { label: "Đã đối soát", value: "13" }, // GHTK status 6 → đã đối soát xong
]

export const shipper: Option[] = [
  { label: "Hải Thương", value: "1" },
  { label: "Đông", value: "2" },
  { label: "Hùng", value: "3" },
  { label: "NV kho 2", value: "4" },
  { label: "Dũng", value: "5" },
  { label: "Quyết", value: "6" },
  { label: "Anh Thuy xe tải", value: "7" },
  { label: "Anh Mạnh ship", value: "8" },
  { label: "A Sơn ship ", value: "9" },
  { label: "Anh Thuy xe máy", value: "10" },
  { label: "Trung", value: "11" },
  { label: "Lợi", value: "12" }
];

export const shipperOut: Option[] = [
  { label: "Hải Thương ngoài", value: "1" },
  { label: "Đông ngoài", value: "2" },
  { label: "Hùng ngoài", value: "3" },
  { label: "NV kho 2 ngoài", value: "4" },
  { label: "Dũng ngoài", value: "5" },
  { label: "Quyết ngoài", value: "6" },
  { label: "Anh Thuy xe tải ngoài", value: "7" },
  { label: "Anh Mạnh ship ngoài", value: "8" },
  { label: "A Sơn ship ngoài ", value: "9" },
  { label: "Anh Thuy xe máy ngoài", value: "10" },
  { label: "Ship app", value: "11" },
  { label: "Ship ghtk ngoài", value: "12" },
  { label: "Lợi", value: "13" },

];

export const pushGHTKOptions: Option[] = [
  { label: "Có", value: "true" },
  { label: "Không", value: "false" },
];

export const typeTransactionOptions: Option[] = [
  { label: "Đã thanh toán 1 phần", value: "1" },
  { label: "Thanh toán đủ", value: "2" },
  { label: "Chưa thanh toán", value: "3" },
  { label: "Khách thanh toán thừa", value: "4" },
];

export const ghtkStatusOptions: Option[] = [
  { value: "-1", label: "Hủy đơn hàng" },
  { value: "1", label: "Chưa tiếp nhận" },
  { value: "2", label: "Đã tiếp nhận" },
  { value: "3", label: "Đã lấy/nhập kho" },
  { value: "4", label: "Đang giao hàng" },
  { value: "5", label: "Đã giao hàng" },
  { value: "6", label: "Đã đối soát" },
  { value: "7", label: "Không lấy được" },
  { value: "8", label: "Hoãn lấy hàng" },
  { value: "9", label: "Không giao được" },
  { value: "10", label: "Delay giao hàng" },
  { value: "11", label: "Đã đối soát trả" },
  { value: "12", label: "Đang lấy hàng" },
  { value: "13", label: "Đơn bồi hoàn" },
  { value: "20", label: "Đang trả hàng" },
  { value: "21", label: "Đã trả hàng" },
];

export const splitTypeOptions: Option[] = [
  { label: "Hóa đơn mẹ (đã tách)", value: "parent" },
  { label: "Hóa đơn con (kiện nhỏ)", value: "child" },
  { label: "Hóa đơn thường", value: "normal" },
];

export const branchOptions = [
  { label: "Hà Nội", value: "HN" },
  { label: "Sài Gòn", value: "SG" }
];

export interface PackageData {
  id: string;
  parent_id?: string;
  name: string;
  items?: Product[];
  ghtk_items?: (GHTKProduct | PackageData)[];
  product_codes?: string[];
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  package_length?: number;
  package_width?: number;
  package_height?: number;
  dimWeightAck?: number;
  transport: "road" | "fly" | "road_bbs";
  note?: string;
  cod?: number;
  pick_option?: "cod" | "post";
  pick_date?: string;
  pick_name?: string;
  pick_tel?: string;
  pick_address?: string;
  pick_province?: string;
  pick_district?: string;
  pick_ward?: string;
  pick_street?: string;
  solutions?: number[];
  is_freeship?: number; // 0: Khách trả, 1: Shop trả
  value?: number; // Giá trị khai giá (Bảo hiểm)
  ghtk_note?: string;
  delivery_fee?: number;
  insurance_fee?: number;
  total_box?: number;
  pick_money?: number; // Tiền thu hộ thực tế
  extraFee?: number; // Thu khác
  ghtk_error?: string;
  extFees?: GHTKFeeItem[];
  totalExtFee?: number;
  totalQtySnapshot?: number;
  code?: string;
  weightUnit?: string;
  selectedQty?: number;
}
