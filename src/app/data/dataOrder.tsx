import { FileInfos } from "./dataMold";
import { Project, Tags } from "./interface/customer";

export interface QuoteItem {
  [key: string]: unknown;
  id?: string;
  idProType?: string | number;
  code?: string; // Mã đơn hàng
  name?: string;
  createdAt?: string; // Ngày tạo
  updatedAt?: string; // Ngày update
  updatedByName?: string; // Người update
  customerId?: string | null;
  customer?: string; // Khách hàng
  productId?: string;
  product?: string; // Sản phẩm
  status?: string; // Trạng thái
  deliveryTime?: string; // Ngày giờ giao hàng
  receiver?: number | null; // người nhận
  createdBy?: number | null; // id người tạo
  createdByName?: string; // tên người tạo
  madeByUser?: number | null; // người làm
  receivedDate?: string; // ngày nhận
  statusLevel?: string | number; // Trạng thái báo giá
  location?: string;
  long?: number;
  width?: number;
  height?: number;
  size?: string;
  quantityList?: string[];
  description?: string;
  idCoverInside?: number | string; // kt phủ bì hay lọt lòng
  fileAttached?: FileInfos[];
  fileDesign?: FileInfos[];
  comments?: Comment[];
  paperId?: number;
  isPrint?: number | string;
  idPrintFaceIn?: number | string;
  idPrintFaceOut?: number | string;
  idInOut?: number | string;
  numColorPrint?: number;
  typeColorPrint?: string | "default" | "white";
  idDanGhim?: number | string;
  // idWave?: number | string;
  idCan?: number | string;
  idCanBongMoInOut?: number | string; // cán bóng hay cán mờ, mặt trong hay mặt ngoài
  idCanBongMo?: number | string;
  isOtherMachining?: boolean;
  otherMachining?: string;
  idPaperWaveOffset?: number | string;
  idPaperBag?: number | string;
  idPaperBox1layer?: number | string;
  idPaperColdCarton?: number | string;
  bagStrap?: string;
  thicknessColdCarton?: number;
  isApprove?: boolean; //phê duyệt chưa?
  materialTray?: number; //chất liệu khay
  descriptionDesign?: string;
  sizeBillet?: SizeBillet[];
  printArea?: PrintArea[];
  mold?: Mold[];
  maketFile?: FileInfos[];
  idPrice?: string | null; // khóa ngoại-bài tính giá

  typePrintId?: number; //in 2 mảnh giống nhau hay khác nhau
  isPrintLid?: string; //in nắp hay không
  piece1?: PieceBox; //TH đối với hộp 2 mảnh
  piece2?: PieceBox; //TH đối với hộp 2 mảnh
  onlyPrintLid?: number; // chỉ in duy nhất mặt nắp thôi

  requireDesign?: string[]; // yêu cầu thiết kế 
  requireDesignNote?: string;
  requirePrintAreaNote?: string;
  requireMoldNote?: string;
  requireM2PrintNote?: string; // yêu cầu m2 in
  requireMaketNote?: string; // yêu cầu lên maket

  selectedType?: number | null;
  selectedWave?: string | null;
  selectedColor?: string | null;
  selectedPrice?: number | null;
  selectedQuantitative?: string | null,

  type2m?: string;
  widthPrint?: number;
  longPrint?: number;

  typeCustomer?: number | null;
  sourceCustomer?: number | null;
  sourceCustomerPage?: number | null;

  //TH đối với in mặt ngoài/mặt trong
  printOutside?: OutInBox;
  printInside?: OutInBox;

  isDone?: boolean;
  quantityDone?: number;
  priceDone?: number;
  noteDone?: string | null;
  fileQuoteDone?: FileInfos[];
  dateDone?: string | Date | null;
  timeOfDayDone?: number;
  statusLevelDone?: number; // tình trạng chốt đơn bt-gấp-rất gấp
  statusProduction?: string; // trạng thái sản xuất của báo giá

  // Kích thước vùng in ==================================
  printAreaSizeOutside?: PrintAreaSize;
  printAreaSizeInside?: PrintAreaSize;

  tags?: Tags[]; // Thẻ tag báo giá
  tagProject?: Tags[]; // Thẻ tag dự án
  tagProduction?: Tags[]; // Thẻ tag bên Lâm Thiết kế
  tagProductionNCC?: Tags[]; // Thẻ tag bên Lâm Thiết kế
  tagProductionOther?: Tags[]; // Thẻ tag bên Lâm Thiết kế
  tagManageDesign?: Tags[]; // Thẻ tag quản lý thiết kế

  maketFileDone?: FileInfos[]; // chốt maket
  dateMaketDone?: string | null;
  statusMaketDone?: string; // Trạng thái "NOT"-"DONE"

  projectQuote?: Project | null;

  // SX XONG =================
  quantityProductionDone?: number; // Số lượng sản xuất xong
  fileProductionDone?: FileInfos[]; // chốt maket
  dateProductionDone?: string | null; //ngày thực hiện
  userProductionDone?: string; // người thực hiện
  noteProductionDone?: string; //ghi chú

  //CHỐT CHẠY =================
  statusChotChay?: boolean; // Trạng thái true/false
  dateChotChay?: string | null; //ngày chốt chạy
  userChotChay?: string; // người chốt chạy
}

// Kích thước vùng in 
export interface PrintAreaSize {
  long?: number; //Dài 
  width?: number; //rộng
}

export interface OutInBox {
  numColorPrint?: number; //số màu in,
  hesoIN?: number; //hệ số in dựa trên diện tích mảnh
  priceFlexoDesign?: number | string; //giá in flexo Thiết kế 
  priceFlexo?: number | string; //giá in flexo
}

export interface PieceBox {
  idInOut?: string; // in mặt trong hay ngoài
  idPrintFaceIn?: string; //in mặt trong
  idPrintFaceOut?: string; //in mặt ngoài
  isPrintLid?: string; // in nắp hay không
  numColorPrint?: number; //số màu in,
  idPrint?: string; // có in mảnh 1 hay 2 không
}

type SizeBillet = {
  long: number;
  width: number;
}
type Mold = {
  price: number;
}

export type PrintArea = {
  outIn: string;
  price: number;
  type?: "LO" | "L" | "DIGITAL" | null;
}

export interface QuoteFilter {
  createdAt?: Date | {
    $gte?: Date;
    $lte?: Date;
  } | null | string;
  location?: string;
  createdBy?: number;
  madeByUser?: number;
  statusLevel?: string | number;
  size?: string;
  selectedType?: number;
  selectedWave?: string;
  status?: string[] | string | null;
  productId?: string | null;
  type2m?: string | null;
  updatedAt?: Date | {
    $gte?: Date;
    $lte?: Date;
  } | null | string;
  typeCustomer?: number | null;
  sourceCustomer?: number | null;
  isPrint?: string | null;
  idDanGhim?: string | null;
  idCan?: string | null;

  tags?: string[] | string | null;
  tagProject?: string[] | string | null;
  tagManageDesign?: string[] | string | null;

  tagProduction?: string[] | string | null;
  tagProductionNCC?: string[] | string | null;
  tagProductionOther?: string[] | string | null;
  statusMaketDone?: string | null;
}

export const optionStatusProduction = [
  { label: "Chưa sản xuất", value: "NOT_PRODUCTION" },
  { label: "Đang sản xuất", value: "DO_PRODUCTION" },
  { label: "Sản xuất xong", value: "COMPLETE_PRODUCTION" },
  { label: "Hủy sản xuất", value: "CANCEL_PRODUCTION" },
]

export const optionStatusMaket = [
  { label: "Chưa chốt Maket", value: "NOT" },
  { label: "Đã chốt Maket", value: "DONE" },
]

export const optionRequireDesign = [
  { label: "YC Tính KT Phôi", value: "1" },
  { label: "YC Tính Bản In", value: "2" },
  { label: "YC Tính Khuôn Bế", value: "3" },
  { label: "YC Tính m2 in", value: "4" },
  { label: "YC lên maket", value: "5" },
]
