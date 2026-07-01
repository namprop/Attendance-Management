import { Mold } from "./dataMold";

export interface PaperProduct {
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
    parts?: PaperProduct[];     // nếu đây là đơn cha thì chứa danh sách các mảnh con

    codeProduct?: string | null; // mã sản phẩm
    idProduct?: string | null; // mã liên kết sản phẩm
}

export interface PaperProductFilter {
    createdAt?: Date | {
        $gte?: Date;
        $lte?: Date;
    } | null | string;
    selectedType?: number;
    selectedWave?: string;
    idSupplier?: number;
    typebox?: string;
    createdBy?: number | null;
}
