import { Tags } from "./customer";
import { FileInfo } from "./file";

// Hóa đơn đỏ ===========================================================
export interface ITaskRedInvoice {
    [key: string]: unknown;
    code?: string; // Mã đơn hàng
    name?: string;
    status?: string; // Trạng thái
    description?: string;
    tags?: Tags[]; // Thẻ tag báo giá
    tagsKT?: Tags[]; // Thẻ tag báo giá
    fileBillInvoice?: FileInfo[]; //file bill-hóa đơn
    fileDraft?: FileInfo[]; //file hóa đơn nháp
    fileDone?: FileInfo[]; //file hóa đơn Chốt ký
    fileAttach?: FileInfo[]; //file đính kèm

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

    statusLevel?: string | number; // Trạng thái báo giá
    isApproved?: boolean; //phê duyệt chưa?
    approvedBy?: number | null; // người duyệt
    approvedByName?: string; // tên người duyệt
}

export interface ITaskRedInvoiceFilter {
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

export const StatusRedInvoice = [
    { label: "Cần xuất nháp", value: "NEED_DRAFT", color: "#ff6566" },
    { label: "Đã xuất nháp", value: "DRAFTED", color: "#2196f3" },
    { label: "Chốt ký & gửi mail", value: "SIGNED_AND_SENT", color: "#21e5f3" },
    { label: "Hoàn thành", value: "COMPLETED", color: "#00FF00" },
    { label: "Đã gửi khách", value: "SENT_TO_CUSTOMER", color: "#65b432" },
    { label: "Đã hủy", value: "CANCELLED", color: "#FF0000" },
]
