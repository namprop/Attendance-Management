export interface HistoryItem {
    [key: string]: unknown;
    _id?: string;
    targetId: string;        // ID báo giá / tính giá // khách hàng
    targetType: "quote" | "pricing" | "order"| "customer"| "invoice"; // loại đối tượng
    action: string;          // thao tác: create, update, delete, approve...
    description?: string;    // nội dung chi tiết (VD: "Sửa giá từ 10k -> 12k")
    userId: string;          // ID người thao tác
    userName: string;        // tên người thao tác
    timestamp: string;       // ngày giờ ISO
    extra?: Record<string, unknown>; // metadata khác
}
