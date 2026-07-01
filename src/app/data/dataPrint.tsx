// src/app/data/dataPrint.ts

export interface FileInfos {
  id?: string; // ID của bản ghi trong PocketBase hoặc UID tạm thời
  size?: number;
  uploader?: string;
  uploadedAt?: string;
  updatedAt?: string;
  title?: string;
  description?: string;
  originFileObj?: File; // File gốc khi chưa upload
  type?: string;
  links?: string[];
  folder?: string;
  source?: string;

  // Các trường đặc thù sau khi upload lên PocketBase
  collectionId?: string; // ID collection
  recordId?: string;     // ID bản ghi
  fileName?: string;     // Tên file thực tế trong PB
  name?: string;
  key?: string; // Giữ lại để tương thích logic cũ (có thể là full URL)
  url?: string; // Đường dẫn trực tiếp để xem/tải
  thumbUrl?: string; // Đường dẫn thumbnail
  status?: string;// trạng thái
}

export interface FileProductImage {
  id?: string; // id của object ảnh (generateUUID)

  title?: string;

  // map từ FileRecord
  recordId?: string;
  recordProType?: string;
  recordProductName?: string;

  // file gốc trỏ sang kho file của FileRecord
  key?: string; // link/id file gốc
  url?: string; // proxy/cdn nếu có
  type?: string;
  size?: number;

  source?: string; // ví dụ: 'FileRecord'
  uploader?: string;
  uploadedAt?: string;
  updatedAt?: string;
  description?: string;

  // KHÔNG dùng cho loại này (để undefined)
  originFileObj?: File;

  links?: string[];
  folder?: string;
}

export interface Print {
  [key: string]: unknown;

  id?: string;
  type?: string;

  long?: number;
  width?: number;
  height?: number;

  createdAt?: string;
  updatedAt?: string;
  createdBy?: number | null;

  updateNote?: string;
  status?: number;

  location?: string;
  image?: string;
  longPrint?: number; // Dài khuôn
  widthPrint?: number; // Rộng khuôn
  makingDate?: string | null;
  area?: string;

  numberBowls?: number;
  wave?: string;
  class?: number | null;

  name?: string;

  typeProduction?: number | null;
  typePrint?: number | null;

  size?: string;
  sizePaper?: string;

  supplier?: string;
  price?: number;
  statusPay?: number;
  paidPrice?: number;

  comboID?: string | null;



  longPaper?: number;
  widthPaper?: number;

  isPlusPaper?: boolean;
  printPlateType?: number | null; // 1: bản lỏng, 2: bản cứng, 3: bản mềm

  // ===== FILES (ĐÚNG TÊN THEO DETAILPRINT) =====
  filePrintDrawing?: FileInfos[];         // File bản vẽ
  filePrintImage?: FileInfos[];           // Ảnh đại diện
  fileActualPrintImage?: FileInfos[];     // Ảnh bản in thực tế
  filePrintPositionImage?: FileInfos[];   // Ảnh vị trí để bản in
  fileProduction?: FileInfos[];           // Ảnh thành phẩm (upload trực tiếp)
  fileProductImage?: FileProductImage[];  // Ảnh thành phẩm (lấy từ FileRecord)
}

export interface PrintFilter {
  type?: string;
  long?: number;
  width?: number;
  height?: number;

  status?: number;
  location?: string;
  area?: string;

  wave?: string;
  class?: number | null;

  typeProduction?: number | null;
  typePrint?: number | null;

  createdAt?: Date | { $gte?: Date; $lte?: Date } | null;
  makingDate?: Date | { $gte?: Date; $lte?: Date } | null;

  statusPay?: number | null;
}

export interface ComboPrint {
  [key: string]: unknown;
  id?: string;
  name?: string;
}

// ===== OPTIONS =====
export const optionProduction = [
  { label: "Sản xuất", value: 1 },
  { label: "ship COD", value: 2 },
];

export const optionPrintPrint = [
  { label: "Carton sóng thường", value: 1 },
];

export const optionActive = [
  { label: "Đang hoạt động", value: 1 },
  { label: "Ngừng hoạt động", value: 2 },
];

// dataPrint.ts
export const optionPrintPlateType = [
  { label: "Bản lỏng", value: 1 },
  { label: "Bản cứng", value: 2 },
  { label: "Bản mềm", value: 3 },
];



export const optionClassPrint = [
  { label: "1 lớp", value: 1 },
  { label: "3 lớp", value: 3 },
  { label: "5 lớp", value: 5 },
  { label: "7 lớp", value: 7 },
];

export const optionWavePrint = [
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "E", value: "E" },
  { label: "BC", value: "BC" },
  { label: "BE", value: "BE" },
  { label: "BCE", value: "BCE" },
  { label: "BEE", value: "BEE" },
  { label: "Giấy", value: "Giấy" },
  { label: "khác", value: "other" },
];
