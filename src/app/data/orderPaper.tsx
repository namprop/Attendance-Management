import { Mold } from "./dataMold";
import { FileInfo } from "./interface/file";
import { AccountBank } from "./interface/transaction";

export interface OrderPaper {
    [key: string]: unknown
    code?: string;
    name?: string;
    location?: string;
    typebox?: string;
    idSupplier?: number | null;
    long?: number;
    width?: number;
    height?: number;
    size?: string;
    longPhoi?: number;
    widthPhoi?: number;
    acreage?: number;
    selectedType?: number | null;
    selectedWave?: string | null;
    selectedColor?: string | null;
    selectedPrice?: number | null;
    selectedQuantitative?: string | null; // định lượng
    quantityOrder?: number;
    quantityCustomerOrder?: number; // số lượng khách hàng đặt
    statusProduction?: number;
    statusLevel?: number;

    dateOrder?: string;
    dateExpectedCompleteStart?: string | Date | null;
    dateExpectedCompleteEnd?: string | Date | null;
    dateExpectedCompleteTimeOfDay?: number;
    dateExpectedComplete?: string | Date | null; // ngày dự kiến hoàn thành cụ thể
    isDateExpectedComplete?: boolean; // true: ngày cụ thể, false: khoảng ngày

    createdAt?: string;
    createdBy?: number;
    userReceived?: string | null;
    updatedAt?: string;
    updatedBy?: number;
    note?: string;
    idStage?: number; // công đoạn sản xuất
    sizeMoldKnife?: { // kích thước dao khuôn bế
        long?: number;
        width?: number;
    };
    bowls?: number; // số bát
    stripesWidth?: number; // chiều rộng đường kẻ lằn khi chọn công đoạn bổ
    typeStripesWidth?: number | null; // loại lằn

    //ĐẦU RA NHÀ CUNG CẤP ===================================================
    quantityProductionNCC?: number; // số lượng nhà cung cấp sản xuất
    oldQuantityProductionNCC?: number; // số lượng trước khi sửa SL NCC SX
    dateCompleteNCC?: string; // ngày hoàn thành thực tế từ NCC
    locationNCC?: string; // vị trí để hàng NCC
    noteNCC?: string; // ghi chú từ NCC
    peopleProductionNCC?: string; // người sản xuất từ NCC
    peopleManageNCC?: string; // người quản lý từ NCC
    quantityErrorNCC?: number; // số lượng hàng lỗi

    //LÊN HÀNG ===================================================
    quantityPickUp?: number; // số lượng lên hàng
    chooseQuantityPickUp?: number; // số lượng lên hàng chọn (1: 1 phần - 2: toàn bộ)
    statusPickUp?: number; // trạng thái lên hàng
    datePickUp?: string; // ngày lên hàng
    timePickUp?: number; // thời gian lên hàng

    // NHẬN HÀNG ===================================================
    quantityReceive?: number; // số lượng nhận hàng
    datetimeReceive?: string | null;// ngày nhận hàng

    // SỐ LƯỢNG TỒN KHO NCC ===================================================
    quantityInventoryLastest?: number; // số lượng tồn kho NCC
    quantityAdjustProductionNCC?: number | null; // số lượng sau khi điều chỉnh tồn kho về 0
    // SỐ LƯỢNG TỒN KHO LÊN HÀNG CÒN LẠI- khi lên hàng thì trừ đi để tránh trường hợp lên tiếp
    quantityInventoryPickUpLastest?: number; // số lượng tồn kho lên hàng

    // TỔNG TIỀN VÀ THANH TOÁN ===================================================
    totalPriceOrder?: number; // tống giá sl đặt phôi
    totalPriceSX?: number; // tổng giá sl SX ra

    // THÔNG SỐ KHÓA NGOẠI
    idPlanOrder?: string | null; // mã kế hoạch đặt hàng
    idReceipt?: string | null; // mã phiếu nhận
    isOrder?: boolean; // đã đặt hàng chưa?

    //Phê duyệt
    isApproved?: boolean;
    dateApproved?: string;
    dataPlanOrder?: OrderPlanPaper | null;
    dataMold?: Mold | null;

    statusCompleteOrder?: number; // trạng thái hoàn thành đơn hàng- 1 chưa hoàn thành, 2 nhận 1 phần, 3 hoàn thành
    statusProgress?: number | null; // trạng thái tiến độ 
    typeProduction?: string | null; // loại sản xuất: "production"- SX, "shipcod"- Shipcod

    // TH dành cho hộp 2 mảnh
    idParent?: string | null; // id của đơn cha (nếu đây là 1 mảnh trong đơn 2 mảnh)
    parts?: OrderPaper[];     // nếu đây là đơn cha thì chứa danh sách các mảnh con

    codePrice?: string | null;
    fileQuote?: FileProp[];
    fileInvoice?: FileProp[];
    statusSendSupplier?: number; // trạng thái gửi NCC
    typePaperOrProduct?: number | null; // 1: paper, 2: product

    // dành cho đặt hàng thành phẩm ===========================================================
    serviceProduct?: number | null; // loại gia công: chạp, in, hoàn thiện của thành phẩm
    nameServiceProduct?: string | null; // tên gia công
    priceServiceProduct?: number | null;
    isRolling?: boolean | null; // có cán/không cán
    isPrints?: boolean | null; // có in/không in
    numberPrints?: number | null; // số màu in
    totalPricePaper?: number | null; // tống giá phôi
    totalPriceStage?: number | null; // tống giá gia công
    totalPriceProduct?: number | null; // tổng giá thành phẩm
    price1Stage?: number | null; // giá gia công của 1 hộp
    price1Paper?: number | null; // giá 1 phôi 
    price1Product?: number | null; // giá 1 hộp/thành phẩm
    idCoverInside?: string | null; // lọt lòng/phủ bì
}

export interface OrderReceiptPaper { //tạo Phiếu đặt phôi chung các mã
    [key: string]: unknown;
    //LÊN HÀNG ===================================================
    code?: string; // mã phiếu đặt phôi
    status?: number; // trạng thái đặt phôi - đã gửi NCC/chưa gửi NCC
    statusOrder?: number; // trạng thái đặt phôi
    createdAt?: string;
    createdBy?: number;
    updatedAt?: string;
    updatedBy?: number;
    note?: string;

    //Phê duyệt
    isApproved?: boolean;
    dateApproved?: string;
    idOrderArr?: string[] | null;
    dataOrder?: OrderPaper[] | null;
    address?: string | null; // Địa chỉ đặt phôi
    idSupplier?: number | null; // nhà cung cấp
    phone?: string | null;
}

export interface OrderPlanPaper {
    [key: string]: unknown
    code?: string;
    name?: string;
    location?: string;
    typebox?: string;
    idSupplier?: number;
    long?: number;
    width?: number;
    height?: number;
    acreage?: number;
    size?: string;
    longPhoi?: number;
    widthPhoi?: number;
    selectedType?: number | null;
    selectedWave?: string | null;
    selectedColor?: string | null;
    selectedPrice?: number | null;
    selectedQuantitative?: string | null; // định lượng
    quantityOrder?: number;
    quantityCustomerOrder?: number; // số lượng khách hàng đặt
    statusLevel?: number;
    dateOrder?: string;

    dateExpectedOrder?: string | Date | null;
    dateExpectedOrderStart?: string | Date | null;
    dateExpectedOrderEnd?: string | Date | null;
    dateExpectedOrderTimeOfDay?: number;
    isDateExpectedOrder?: boolean; // true: ngày cụ thể, false: khoảng ngày

    dateExpectedCompleteStart?: string | Date | null;
    dateExpectedCompleteEnd?: string | Date | null;
    dateExpectedCompleteTimeOfDay?: number;
    dateExpectedComplete?: string | Date | null; // ngày dự kiến hoàn thành cụ thể
    isDateExpectedComplete?: boolean; // true: ngày cụ thể, false: khoảng ngày

    createdAt?: string;
    createdBy?: number;
    updatedAt?: string;
    updatedBy?: number;
    note?: string;
    idStage?: number; // công đoạn sản xuất
    sizeMoldKnife?: { // kích thước dao khuôn bế
        long?: number;
        width?: number;
    };
    bowls?: number; // số bát
    stripesWidth?: number; // chiều rộng đường kẻ lằn khi chọn công đoạn bổ

    //ĐẦU RA NHÀ CUNG CẤP ===================================================
    quantityProductionNCC?: number; // số lượng nhà cung cấp sản xuất
    dateCompleteNCC?: string; // ngày hoàn thành thực tế từ NCC
    locationNCC?: string; // vị trí để hàng NCC
    noteNCC?: string; // ghi chú từ NCC
    peopleProductionNCC?: string; // người sản xuất từ NCC
    peopleManageNCC?: string; // người quản lý từ NCC
    quantityErrorNCC?: number; // số lượng hàng lỗi

    //LÊN HÀNG ===================================================
    quantityPickUp?: number; // số lượng lên hàng
    chooseQuantityPickUp?: number; // số lượng lên hàng chọn (1: 1 phần - 2: toàn bộ)
    statusPickUp?: number; // trạng thái lên hàng
    datePickUp?: string; // ngày lên hàng
    timePickUp?: number; // thời gian lên hàng

    // NHẬN HÀNG ===================================================
    quantityReceive?: number; // số lượng nhận hàng
    datetimeReceive?: string | null;// ngày nhận hàng

    // SỐ LƯỢNG TỒN KHO NCC ===================================================
    quantityInventoryLastest?: number; // số lượng tồn kho NCC
    quantityAdjustProductionNCC?: number | null; // số lượng sau khi điều chỉnh tồn kho về 0
    // SỐ LƯỢNG TỒN KHO LÊN HÀNG CÒN LẠI- khi lên hàng thì trừ đi để tránh trường hợp lên tiếp
    quantityInventoryPickUpLastest?: number; // số lượng tồn kho lên hàng

    // TỔNG TIỀN VÀ THANH TOÁN ===================================================
    totalPriceOrder?: number; // tống giá sl đặt phôi
    totalPriceSX?: number; // tổng giá sl SX ra

    // THÔNG SỐ KHÓA NGOẠI
    isOrder?: boolean; // đã đặt hàng chưa?
    idPlanOrder?: string | null; // mã kế hoạch đặt hàng
    idOrderPaper?: string | null; // mã phiếu đặt hàng
    idReceipt?: string | null; // mã phiếu nhận

    //Phê duyệt
    isApproved?: boolean;
    dateApproved?: string;
    dataMold?: Mold | null;
    statusProgress?: number | null; // trạng thái tiến độ kế hoạch đặt hàng
    typeProduction?: string | null; // loại sản xuất: "production"- SX, "shipcod"- Shipcod
    // TH dành cho hộp 2 mảnh
    idParent?: string | null; // id của đơn cha (nếu đây là 1 mảnh trong đơn 2 mảnh)
    parts?: OrderPlanPaper[];     // nếu đây là đơn cha thì chứa danh sách các mảnh con

    codePrice?: string | null;
    fileQuote?: FileProp[];
    fileInvoice?: FileProp[];

    typePaperOrProduct?: number | null; // 1: paper, 2: product

    // dành cho đặt hàng thành phẩm ===========================================================
    serviceProduct?: number | null; // loại gia công: chạp, in, hoàn thiện của thành phẩm
    nameServiceProduct?: string | null; // tên gia công
    priceServiceProduct?: number | null;
    isRolling?: boolean | null; // có cán/không cán
    isPrints?: boolean | null; // có in/không in
    numberPrints?: number | null; // số màu in
    totalPricePaper?: number | null; // tống giá phôi
    totalPriceStage?: number | null; // tống giá gia công
    totalPriceProduct?: number | null; // tổng giá thành phẩm
    price1Stage?: number | null; // giá gia công của 1 hộp
    price1Paper?: number | null; // giá phôi của 1 hộp
    price1Product?: number | null; // giá 1 hộp/thành phẩm
    idCoverInside?: string | null; // lọt lòng/phủ bì
}

export interface PickUpPaper {  // danh sách lên hàng
    [key: string]: unknown;
    //LÊN HÀNG ===================================================
    code?: string; // mã phiếu lên hàng
    nameProduct?: string;
    quantityPickUp?: number; // số lượng lên hàng
    chooseQuantityPickUp?: number; // số lượng lên hàng chọn (1: 1 phần - 2: toàn bộ)
    statusPickUp?: number; // trạng thái lên hàng - đã tạo phiếu lên hàng/ chưa tạo phiếu
    datePickUp?: string; // ngày lên hàng
    timePickUp?: number; // thời gian lên hàng
    totalPricePickUp?: number; // tống giá sl số lượng lên hàng
    note?: string;

    // Khóa phụ
    idOrderPaper?: string | null; // mã phiếu đặt hàng
    isReceived?: boolean; // đã nhận hàng chưa?
    idReceipt?: string | null; // mã phiếu nhận
    statusPickUpReceipt?: number; // trạng thái phiếu lên hàng?

    //Phê duyệt
    isApproved?: boolean;
    dateApproved?: string;

    createdAt?: string;
    createdBy?: number;
    updatedAt?: string;
    updatedBy?: number;

    dataOrder?: OrderPaper | null;

    idSupplier?: number | null; // nhà cung cấp
    typeProduction?: string | null; // loại sản xuất: "production"- SX, "shipcod"- Shipcod

    typePaperOrProduct?: number | null; // 1: paper, 2: product
}

export interface PickUpReceiptPaper { //tạo Phiếu lên hàng chung các mã
    [key: string]: unknown;
    //LÊN HÀNG ===================================================
    code?: string; // mã phiếu lên hàng
    status?: number; // trạng thái lên hàng - đã gửi NCC/chưa gửi NCC
    statusPickUp?: number; // trạng thái lên hàng
    createdAt?: string;
    createdBy?: number;
    updatedAt?: string;
    updatedBy?: number;
    note?: string;

    //Phê duyệt
    isApproved?: boolean;
    dateApproved?: string;
    idPickUpArr?: string[] | null;
    dataPickUp?: PickUpPaper[] | null;
    address?: string | null; // Địa chỉ lên hàng
    phone?: string | null;
    idSupplier?: number | null; // nhà cung cấp
}
// file recive
export interface FileProp {
    id?: string;
    size?: number;
    uploader?: string;
    uploadedAt?: string;
    updatedAt?: string;
    title?: string;
    description?: string;
    originFileObj?: File;
    type?: string;
    links?: string[],
    folder?: string,
    source?: string
    key?: string;
    url?: string;
    thumbUrl?: string;
}

export interface ReceiveOrderPaper {
    [key: string]: unknown
    code?: string; // mã phiếu nhận
    nameProduct?: string;
    quantityReceive?: number; // số lượng nhận
    oldQuantityReceive?: number; // số lượng nhận cũ, TH sửa
    createdAt?: string; // ngày tạo
    createdBy?: number; // người tạo
    updatedAt?: string; // ngày update
    updatedBy?: number; // người update
    receivedBy?: string; // người nhận chính
    subReceivedBy?: string; // người phụ nhận
    dateReceived?: string; // ngày nhận
    files?: FileProp[]; // file/ ảnh phiếu nhận
    note?: string; // ghi chú

    idSupplier?: number | null; // nhà cung cấp
    quantityInventory?: number; // số lượng tồn kho NCC
    totalReceive?: number; // thành tiền sl nhận * giá * S

    // THÔNG SỐ KHÓA NGOẠI
    idOrderPaper?: string | null; // mã phiếu đặt hàng
    idPickUpPaper?: string | null; // mã phiếu lên hàng
    idReceipt?: string | null; // mã phiếu nhận
    isPaid?: boolean; // đã thanh toán chưa?
    statusCreatePayment?: boolean; // trạng thái tạo phiếu TT ?

    //Phê duyệt
    isApproved?: boolean;
    dateApproved?: string;

    dataPickUp?: PickUpPaper | null;
    dataReceipt?: ReceiptPaper | null;

    //Điều chỉnh giá phôi m2, giá 1 phôi/1 hộp
    adjustmentType?: number;
    isAdjustmentType?: boolean;
    paperPrice?: number; // giá phôi m2
    price1PaperOrProduct?: number | null; // giá 1 phôi/1 hộp
    ajustmentPaperPrice?: number; //giá phôi điều chỉnh
    ajustmentPrice1PaperOrProduct?: number; //giá 1 phôi/1 hộp điều chỉnh
    totalAjustmentPrice?: number; // tổng giá sau khi điều chỉnh
    noteAjustment?: string; //Lý do điều chỉnh
    fileAjustment?: FileInfo[];

    quantityRefund?: number; // số lượng hoàn trả cho NCC
    quantityAfterRefund?: number; // số lượng sau hoàn trả
    noteRefund?: string; //lý do hoàn trả
    fileRefund?: FileInfo[];

    total?: number; //tổng cuối

    idPayment?: string | null; // mã phiếu thanh toán
    codePayment?: string | null; // mã phiếu thanh toán
}

export interface ReceiptPaper {
    [key: string]: unknown
    code?: string; // mã phiếu nhận
    codeReceived?: string; // mã phiếu nhận từ NCC
    createdAt?: string; // ngày tạo
    createdBy?: number; // người tạo
    updatedAt?: string; // ngày update
    updatedBy?: number; // người update
    receivedBy?: string; // người nhận
    subReceivedBy?: string; // người phụ nhận
    dateReceivedStart?: string; // ngày bắt đầu
    dateReceivedEnd?: string; // ngày kết thúc
    driveBy?: string; // Lái xe từ NCC
    censorBy?: string; // người kiểm kê từ NCC
    vehicleNumber?: string; // biển số xe
    files?: FileProp[]; // file/ ảnh phiếu nhận
    note?: string; // ghi chú

    idSupplier?: string | number | null; // nhà cung cấp
    quantityInventory?: number; // số lượng tồn kho NCC

    // THÔNG SỐ KHÓA NGOẠI
    idOrderPaper?: string | null; // mã phiếu đặt hàng
    idPickUpPaper?: string | null; // mã phiếu lên hàng

    //Phê duyệt
    isApproved?: boolean;
    dateApproved?: string;
    listReceive?: ReceiveOrderPaper[]
    isPaid?: boolean; // phiếu đã thanh toán chưa?
    statusCreatePayment?: boolean; // tạo phiếu thanh toán chưa?

    //Tổng tiền phiếu
    totalQuantity?: number;
    totalReceipt?: number;

    idPayment?: string | null; // mã phiếu thanh toán
    codePayment?: string | null; // mã phiếu thanh toán
}
// Phiếu thanh toán đặt phôi sóng/thành phẩm
export interface PaymentPapers {
    [key: string]: unknown;
    //PHIẾU THANH TOÁN ===================================================
    code?: string;
    status?: number; // đã thanh toán- chưa thanh toán - thanh toán 1 phần
    createdAt?: string;
    createdBy?: number;
    updatedAt?: string;
    updatedBy?: number;
    note?: string;

    //Phê duyệt
    isApproved?: boolean;
    dateApproved?: string;
    idSupplier?: number | null;
    dataReceipt?: ReceiptPaper[];
    dataReceive?: ReceiveOrderPaper[];
    idReceiptArr?: string[] | null; // mảng id phiếu nhận

    totalQuantity?: number; // tổng số lượng hàng hóa
    totalPaid?: number; // tổng đã trả
    totalPayment?: number; // tổng tiền phiếu
    totalDebt?: number; // tổng tiền chưa trả/ nợ
    dataPaymentMethods?: PaymentMethods[];
}

export interface PaymentMethods {
    id: string; // Thêm ID để dễ xóa
    nameMethod: string;
    method: string;
    accountBank?: AccountBank;
    price: number;
    idAccountPayment?: string | null;
    idAccountBank?: string | null;
    nameAccount?: string;
    tradingDay?: string;
    fileTransfer?: FileInfo[]; // ảnh bill chuyển khoản
}

// filter order và plan order
export interface OrderPaperFilter {
    createdAt?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    selectedType?: number;
    selectedWave?: string;
    dateOrder?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    dateExpectedOrder?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    dateExpectedOrderStart?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    dateExpectedOrderEnd?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    dateExpectedOrderTimeOfDay?: number;

    dateExpectedCompleteStart?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    dateExpectedCompleteEnd?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    dateExpectedComplete?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    dateExpectedCompleteTimeOfDay?: number;
    isOrder?: boolean | null;
    idSupplier?: number;
    typebox?: string;

    //ĐẦU RA NHÀ CUNG CẤP ===================================================
    dateCompleteNCC?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string; // ngày hoàn thành thực tế từ NCC

    datetimeReceive?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string; // ngày nhận hàng
    statusCompleteOrder?: number; // trạng thái hoàn thành đơn hàng
    statusProgress?: number | null; // trạng thái phân bộ
    status?: number; // trạng thái phiếu đặt hàng
    typeProduction?: string | null; // loại sản xuất
    statusSendSupplier?: number | null;
    statusLevel?: number | null;
    createdBy?: number | null;

    typePaperOrProduct?: number | null; // 1: paper, 2: product
}

export interface PickUpPaperFilter {
    createdAt?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;

    datePickUp?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string; // ngày lên hàng
    status?: number;
    idSupplier?: number | null;
    statusPickUp?: number | null;
    typeProduction?: string | null; // loại sản xuất
    statusPickUpReceipt?: number | null; // trạng thái phiếu lên hàng
    isReceived?: boolean | null; // đã nhận hàng chưa?
    statusLevel?: number | null;

    typePaperOrProduct?: number | null; // 1: paper, 2: product
    createdBy?: number | null;
}

export interface ReceicePaperFilter {
    createdAt?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;

    dateReceived?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    dateReceivedStart?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    // ngày bắt đầu
    dateReceivedEnd?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    // ngày kết thúc
    isPaid?: boolean | null;
    typeProduction?: string | null; // loại sản xuất
    statusLevel?: number | null;

    typePaperOrProduct?: number | null; // 1: paper, 2: product
    idSupplier?: number | null;

    statusCreatePayment?: boolean | null;
    createdBy?: number | null;
}

export interface PaymentPaperFilter {
    createdAt?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;

}

export const statusProduction = [
    { value: 1, label: "Đặt hàng" },
    { value: 2, label: "NCC Đang chạy hàng" },
    { value: 3, label: "Hàng đã xong" },
    { value: 4, label: "Kế hoạch lên hàng" },
    { value: 5, label: "Đã nhận Hàng" },
]

export const statusLevel = [
    { value: 1, label: "Bình thường", color: "bg-white" },
    { value: 2, label: "Gấp", color: "bg-yellow-300" },
    { value: 3, label: "Rất Gấp", color: "bg-red-400" },
]

export const optionStage = [
    { label: "Phôi Bế", value: 1 },
    { label: "Phôi Bổ", value: 2 },
    { label: "Tấm Phôi", value: 3 },
    { label: "Phôi Bế 2 mảnh", value: 4 },
    { label: "Phôi Bổ 2 mảnh", value: 5 },
]

export const optionTimeOfDay = [
    { label: "Sáng", value: 1 },
    { label: "Chiều", value: 2 },
    { label: "Trong ngày", value: 3 },
    { label: "Giờ cụ thể", value: 4 },
]

export const quickOptions = [
    { label: "1 ngày", days: 1 },
    { label: "3 ngày", days: 3 },
    { label: "5 ngày", days: 5 },
    { label: "7 ngày", days: 7 },
];

export const optionStatusPickUpReceipt = [
    { label: "Chưa lập phiếu lên hàng", value: 1 },
    { label: "Đã lập phiếu lên hàng, Chưa gửi NCC", value: 2 },
    { label: "Chưa gửi NCC", value: 3 },
    { label: "Đã gửi NCC", value: 4 },
]

export const optionStatusPickUp = [
    { label: "Chưa lên hàng", value: 1 },
    { label: "Lên 1 phần", value: 2 },
    { label: "Lên hàng đủ", value: 3 },
]

export const statusProgress = [
    { value: 1, label: "Kế hoạch" },
    { value: 2, label: "Đã đặt phôi" },
    { value: 3, label: "Chưa SX Xong" },
    { value: 4, label: "SX Xong, Chưa lên hàng" },
    { value: 5, label: "Đã lập Kế hoạch lên hàng, Chưa lên hàng" },
    { value: 6, label: "Nhận 1 phần" },
    { value: 7, label: "Hoàn thành" },
]

export const optionStatusOrderReceipt = [
    { label: "Chưa lập phiếu", value: 1 },
    { label: "Đã lập phiếu, Chưa gửi NCC", value: 2 },
    { label: "Chưa gửi NCC", value: 3 },
    { label: "Đã lập phiếu, Đã gửi NCC", value: 4 },
]

export const optionTypeProduction = [
    { label: "Sản xuất", value: "production" },
    { label: "ShipCOD", value: "shipcod" },
];

export const optionPaperOrProduction = [
    { label: "Phôi", value: 1 },
    { label: "Thành phẩm", value: 2 },
];

// Gia công thành phẩm khu vực HN
export const optionServiceProductHN = [
    { label: "Bổ chạp", value: 1, price: 500, description: "Bổ chạp 500đ/m2" },
    { label: "In", value: 2, price: 500, description: "In 500đ/m2" },
    { label: "Bổ chạp + In", value: 3, price: 700, description: "Bổ chạp + In 700đ/m2" },
    { label: "Bổ chạp + Ko In + Hoàn thiện", value: 4, price: 800, description: "Bổ chạp + ko In + ht 800đ/m2" },
    { label: "Bổ chạp + In + Hoàn thiện", value: 5, price: 1000, description: "Bổ chạp + In + ht 1000đ/m2" },
    // { label: "In 2 lần (3-4 màu)", value: 6, price: 1000, description: "In 2 lần (3-4 màu) 1000đ/m2" },
]

export const statusPayment = [
    { value: 1, label: "Chưa thanh toán" },
    { value: 2, label: "Thanh toán 1 phần" },
    { value: 3, label: "Thanh toán đủ" },
]

export const optionTypeStripesWidth = [
    { label: "Lằn đơn", value: 1 },
    { label: "Lằn đôi", value: 2 },
];
