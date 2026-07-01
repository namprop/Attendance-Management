import { Mold } from "../dataMold";
import { Print } from "../dataPrint";

// src/app/data/interface/file.ts

export interface FileInfo {
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

  key?: string; // Giữ lại để tương thích logic cũ (có thể là full URL)
  url?: string; // Đường dẫn trực tiếp để xem/tải
  thumbUrl?: string; // Đường dẫn thumbnail
  status?: string;// trạng thái

}

// --- SỬA ĐỔI: Sử dụng kiểu dữ liệu cụ thể thay vì any[] ---
export type DesignItemState = {
  dataPrint?: Print;
  id: string; // for key
  idStage?: number;
  originalfile?: FileInfo[];
  fileAttached?: FileInfo[];
  fileregularbox?: FileInfo[];
  fileboxoffset?: FileInfo[];
  filetray?: FileInfo[];
  filebox1?: FileInfo[];
  filecut?: FileInfo[];
  fileprint?: FileInfo[];
  filevideo?: FileInfo[];

  filedemo?: FileInfo[];

  namecombo?: string;
  dataMold?: Mold;
  dataFileRecord?: FileRecord;
};
// -------------------------------------

export interface FileRecord {
  [key: string]: unknown;
  id?: string; // mã bản ghi
  ProType?: string; //loại sản phẩm
  createdAt?: string;
  createdUt?: string;
  createdBy?: string, //người tạo
  createdByRole?: string,//quyền
  uploadFile?: string,// người tải file
  idcustomer?: string; // mã khách hàng
  idoder?: string; // mã đơn hàng
  productname?: string; // tên sản phẩm
  size?: string; // kích thước phủ bì
  length?: number; // dài
  width?: number; // rộng
  height?: number; // cao
  note?: string; // ghi chú
  status?: string; // trạng thái
  links?: string[]; // linkpadora
  name?: string // tên kh

  // --- CÁC TRƯỜNG FILE GỐC (Legacy) ---
  originalfile?: FileInfo[];
  fileAttached?: FileInfo[];
  fileregularbox?: FileInfo[];
  fileboxoffset?: FileInfo[];
  filetray?: FileInfo[];
  filebox1?: FileInfo[];
  filecut?: FileInfo[];
  fileprint?: FileInfo[];
  filevideo?: FileInfo[];

  filedemo?: FileInfo[];

  // ----------------------------------

  designItems?: DesignItemState[]; // <-- Quan trọng: Đây là nơi lưu mảng
  idStage?: number; // công đoạn sản xuất
  orderLink?: string // link đơn hàng
  area?: string,
  typecustomer?: string,
  isApproved?: boolean | string;
  isFix?: boolean,
  dateApproved?: string;
  complete?: boolean,
  productiontype?: string,
  isApproveDone?: boolean,
  productId?: string;
  isDesign?: boolean | string;
  namecombo?: string
  folderPath?: string;
  typeProduction?: string | null;
}
