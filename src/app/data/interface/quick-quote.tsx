import { Project, Tags } from "./customer";
import { FileInfo } from "./file";

// Báo giá nhanh ===========================================================
export interface IQuickQuote {
    [key: string]: unknown;
    code?: string; // Mã đơn hàng
    name?: string;
    status?: string; // Trạng thái
    description?: string;
    tags?: Tags[]; // Thẻ tag báo giá
    tagsKT?: Tags[]; // Thẻ tag báo giá
    fileDesign?: FileInfo[]; //file in thiết kế
    fileMaket?: FileInfo[]; //file maket
    fileAttach?: FileInfo[]; //file đính kèm
    fileResultQuote?: FileInfo[]; //file kết quả báo giá
    fileResultCalculateQuote?: FileInfo[]; //file kết quả tính giá

    createdAt?: string; // Ngày tạo
    createdBy?: number | null; // id người tạo
    createdByName?: string; // tên người tạo
    updatedAt?: string; // Ngày update
    updatedBy?: string; // Người update
    updatedByName?: string; // Người update

    customerId?: string | null; //mã khách hàng
    customerName?: string; // tên Khách hàng
    companyName?: string; // tên Công ty
    taxCode?: string; // mã số thuế
    email?: string; // email
    location?: string | null; // địa chỉ
    typeCustomer?: number | null; // phân loại khách hàng cũ/mới
    sourceCustomer?: number | null; // nguồn khách hàng
    typeProduct?: string | null; // loại sản phẩm
    typeBox?: string | null; // loại hộp

    statusLevel?: string | number; // Trạng thái báo giá
    isApproved?: boolean; //phê duyệt chưa?
    approvedBy?: number | null; // người duyệt
    approvedByName?: string; // tên người duyệt

    tagProject?: Tags[]; // Thẻ tag dự án
    projectQuote?: Project | null;

    // Tính giá xong
    calculationDone?: boolean;

    // chốt đơn
    isDone?: boolean; // đã chốt đơn hay chưa
    quantityDone?: number;
    priceDone?: number;
    noteDone?: string | null;
    fileQuoteDone?: FileInfo[];
    dateDone?: string | Date | null;
    timeOfDayDone?: number;
    statusLevelDone?: number; // tình trạng chốt đơn bt-gấp-rất gấp
    statusProduction?: string; // trạng thái sản xuất của báo giá

    // chốt maket
    maketFileDone?: FileInfo[]; // chốt maket
    dateMaketDone?: string | null;
    statusMaketDone?: string; // Trạng thái "NOT"-"DONE"

    // SX XONG =================
    quantityProductionDone?: number; // Số lượng sản xuất xong
    fileProductionDone?: FileInfo[]; // chốt maket
    dateProductionDone?: string | null; //ngày thực hiện
    userProductionDone?: string; // người thực hiện
    noteProductionDone?: string; //ghi chú

    // Thiết kế
    tagProduction?: Tags[]; // Thẻ tag bên Lâm Thiết kế
    tagProductionNCC?: Tags[]; // Thẻ tag bên Lâm Thiết kế
    tagProductionOther?: Tags[]; // Thẻ tag bên Lâm Thiết kế
    tagManageDesign?: Tags[]; // Thẻ tag quản lý thiết kế

    requireDesign?: string[]; // yêu cầu thiết kế 
    requireDesignNote?: string;
    requirePrintAreaNote?: string;
    requireMoldNote?: string;
    requireM2PrintNote?: string; // yêu cầu m2 in
    requireMaketNote?: string; // yêu cầu lên maket
    sizeBillet?: SizeBillet[];
    printArea?: PrintArea[];
    mold?: Mold[];
    // Kích thước vùng in ==================================
    printAreaSizeOutside?: PrintAreaSize;
    printAreaSizeInside?: PrintAreaSize;

    //CHỐT CHẠY =================
    statusChotChay?: boolean; // Trạng thái true/false
    dateChotChay?: string | null; //ngày chốt chạy
    userChotChay?: string; // người chốt chạy
}

export interface IQuickQuoteFilter {
    createdAt?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    createdBy?: number | null;
    statusLevel?: string | number;
    status?: string[] | string | null;
    updatedAt?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;

    tags?: string[] | string | null;
    tagsKT?: string[] | string | null;
    customerId?: string | null;
}

type SizeBillet = {
    long: number;
    width: number;
}
type Mold = {
    price: number;
}

type PrintArea = {
    outIn: string;
    price: number;
    type?: "LO" | "L" | "DIGITAL" | null;
}

// Kích thước vùng in 
type PrintAreaSize = {
    long?: number; //Dài 
    width?: number; //rộng
}


export const StatusQuickQuote = [
    { label: "Cần báo giá", value: "NEW_QUOTE", color: "#ff6f61", type: 1 },          // đỏ cam
    { label: "Đang tính giá", value: "PRICING", color: "#2196f3", type: 1 },           // xanh dương
    { label: "Thiếu thông tin", value: "MISSING_INFO", color: "#9c27b0", type: 1 },    // tím
    { label: "Từ chối báo giá", value: "REJECTED", color: "#f44336", type: 1 },         // đỏ
    { label: "YC Tính giá lại", value: "REPRICE_REQUEST", color: "#00bcd4", type: 1 }, // cyan
    { label: "Tính giá xong", value: "PRICED", color: "#3f51b5", type: 1 },             // indigo
    { label: "Đã gửi khách", value: "SENT_TO_CUSTOMER", color: "#009688", type: 1 },    // teal
    { label: "Chốt đơn", value: "ORDER_CONFIRMED", color: "#2e7d32", type: 1 },         // xanh đậm
    { label: "Không chốt đơn", value: "ORDER_FAILED", color: "#795548", type: 1 },      // nâu

    { label: "Yêu cầu thiết kế", value: "REQUEST_MAKET", color: "#ff9800", type: 2 }, // cam
    { label: "Đang thiết kế", value: "DESIGNING_MAKET", color: "#ffc107", type: 2 },  // vàng
    { label: "Thiết kế xong", value: "MAKET_DONE", color: "#4caf50", type: 2 },     // xanh lá

    { label: "Hủy báo giá", value: "CANCELLED", color: "#ff0000", type: 1 },     // đỏ
]
