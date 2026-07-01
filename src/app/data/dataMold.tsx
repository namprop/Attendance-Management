
export interface FileInfos {
  id?: string;
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
  name?: string;
  size?: number;
}


export interface FileProductImage {
  id?: string;           // ID của chính object ảnh này (tạo bằng crypto)
  title?: string;        // Tên ảnh (từ newProductImageTitle)

  recordId?: string;       // ID của bản ghi (selectedProductFileRecord.id)
  recordProType?: string;  // Loại SP (selectedProductFileRecord.ProType)
  recordProductName?: string; // Tên SP (selectedProductFileRecord.productname)

  key?: string;          // Link ảnh
  type?: string;         // Loại file ảnh
  size?: number;
  source?: string;       // Sẽ set là 'FileRecord'

  uploader?: string;
  uploadedAt?: string;
  updatedAt?: string;
  description?: string;
  originFileObj?: File;  // Sẽ luôn là null/undefined cho loại này
  links?: string[];
  folder?: string;
  url?: string;
}

export interface Mold {
  [key: string]: unknown;
  id?: string; // ID
  type?: string; // Loại sản phẩm
  long?: number; // Dài
  width?: number; // Rộng
  height?: number; // Cao

  createdAt?: string; // ngày tạo
  updatedAt?: string; // ngày update
  createdBy?: number | null; // Người tạo
  updateNote?: string; // Ghi chú sửa
  status?: number; // Trang thái

  location?: string; // Vi tri khuôn
  image?: string; // Anh
  makingDate?: string | null; // Ngày làm
  area?: string; // Khu vực HN / HCM
  numberBowls?: number; // Số bát bế
  wave?: string; // B, C, E, BC, BE, BCE...
  class?: number | null; // số lớp 3, 5, 7
  name?: string;
  typeProduction?: number | null; // SX hay shipcod
  typePrint?: number | null; // carton lạnh, offset, thường,  
  size?: string; // kích thước hộp d x r x c
  sizePaper?: string; // kích thước phôi d x r
  supplier?: string; // nhà làm khuôn
  price?: number; // giá khuôn
  statusPay?: number; // trang thái thanh toán đã trả/chưa trả
  paidPrice?: number; // giá đã thanh toán
  comboID?: string | null;
  longMold?: number; // Dài khuôn
  widthMold?: number; // Rộng khuôn
  longPaper?: number; // Dài phôi
  widthPaper?: number; // Rộng phôi
  isPlusPaper?: boolean; // có cộng phôi không

  fileMoldDrawing?: FileInfos[];             // File khuôn (bản vẽ)
  fileRepresentativeImage?: FileInfos[]; // Ảnh đại diện (ảnh chụp bản vẽ)
  fileActualMoldImage?: FileInfos[];     // Ảnh khuôn thực tế
  fileMoldPositionImage?: FileInfos[]; // Ảnh vị trí để khuôn
  fileProduction?: FileInfos[]; // file ảnh thành phẩm
  fileProductImage?: FileProductImage[];// Ảnh thành phẩm
}


export interface MoldFilter {
  type?: string; // Loại sản phẩm
  long?: number; // Dài
  width?: number; // Rộng
  height?: number; // Cao
  status?: number; // Trang thái
  location?: string; // Vi tri khuôn
  area?: string; // Khu vực HN / HCM
  wave?: string; // B, C, E, BC, BE, BCE...
  class?: number | null; // số lớp 3, 5, 7
  typeProduction?: number | null; // SX hay shipcod
  typePrint?: number | null; // carton lạnh, offset, thường,  
  createdAt?: Date | {
    $gte?: Date;
    $lte?: Date;
  } | null;
  makingDate?: Date | {
    $gte?: Date;
    $lte?: Date;
  } | null;
  statusPay?: number | null;
}

export interface ComboMold {
  [key: string]: unknown;
  id?: string; // ID
  name?: string;
}


export const optionProduction = [
  { label: "Sản xuất", value: 1 },
  { label: "ship COD", value: 2 },
]

export const optionPrintMold = [
  { label: "Carton sóng thường", value: 1 },
  { label: "Offset", value: 2 },
  { label: "Carton lạnh", value: 3 },
  { label: "Túi", value: 4 },
  { label: "Khay foam sẵn", value: 5 },
  { label: "Khay eva", value: 6 },
  { label: "Khay foam SX", value: 7 },
]

export const optionActive = [
  { label: "Đang hoạt động", value: 1 },
  { label: "Ngừng hoạt động", value: 2 },
]

export const optionClassMold = [
  { label: "1 lớp", value: 1 },
  { label: "3 lớp", value: 3 },
  { label: "5 lớp", value: 5 },
  { label: "7 lớp", value: 7 },
]

export const optionWaveMold = [
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "E", value: "E" },
  { label: "BC", value: "BC" },
  { label: "BE", value: "BE" },
  { label: "BCE", value: "BCE" },
  { label: "BEE", value: "BEE" },
  { label: "Giấy", value: "Giấy" },
  { label: "khác", value: "other" },
]
