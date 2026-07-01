import { CocKhuon } from "./options";

export interface DataPrice {
  [key: string]: unknown;
  level: string | number;
  id?: string;
  location: string | number;
  typebox: string | number;
  isKTPhoiTK: boolean;
  typelong: string | number;
  long: number;
  width: number;
  height: number;
  longPhoi: number;
  widthPhoi: number;
  quantity: number;
  acreage: number;
  paperPriceId?: number;
  pricePhoiId?: number | string;
  namePhoi?: string;
  pricePhoi?: number;
  idBoBe?: number | string;
  idKhuon?: number | string;
  idPrint: number | string;
  activeDanGhim?: boolean;
  activeBocLe?: boolean;
  activeCanBongThuong?: boolean;
  activeCanLan?: boolean;
  activeXaPhoi?: boolean;
  idDanGhim?: number | string;
  idDanTayMay?: number | string;
  idInLuaOrMay?: number | string;
  bochapId?: number | string;
  priceBoChap?: number;
  mayBeId?: number | string;
  idKhobe?: number | string;
  priceBe?: number;
  minBo?: number;
  minBe?: number;
  minDanGhim?: number;
  minBocLeBo?: number;
  minCanlan?: number;
  priceDanmay: number;
  priceDantay: number;
  priceGhim: number;
  priceCanlan: number;
  priceXaPhoi: number;
  priceBocLeBo: number;
  hesoIN: number;
  rangeIdINlua: number | string;
  numColorPrint?: number;
  idFlexoWave?: number | string;
  priceFlexo: number | string;
  priceFlexoDesign: number | string;
  minPrintFlexo?: number; // min in flexo là bn?
  priceCanbong: number | string;
  note?: string;
  productName?: string;
  unit?: string;
  unitBo?: number | string;
  quantityList?: QuantityPriceMap;
  numBatBe?: number;
  idPrintFace?: number | string;
  acreagePrintFace?: number;
  totalPricePhoi: number;
  totalBochap: number;
  totalBe: number;
  totalDanGhim: number;
  totalCanlan: number;
  totalXaPhoi: number;
  totalBocLeBo: number;
  totalINlua: number;
  totalFlexo: number;
  totalCanbong: number;
  totalPriceKhuon: number;
  totalCongDoan: number;
  totalAll: number;
  priceOnlyOne: number;
  hesoTong: number;
  priceToCustomer?: number;
  tags?: string[];
  status?: number | string;
  customerCRM?: CustomerCRM;
  comments?: Comment[]; // Thêm trường comments
  typePrintId?: number | string;
  idTypePaper?: number | string;
  piece1?: PieceBox; //TH đối với hộp 2 mảnh
  piece2?: PieceBox; //TH đối với hộp 2 mảnh
  idInOut?: string | number; // in mặt trong hay ngoài
  idPrintFaceIn?: string | number; //in mặt trong
  idPrintFaceOut?: string | number; //in mặt ngoài
  isPrintLid?: string; // có in nắp hay không
  idQuote?: number | string;
  createdBy?: number | string; //tạo bởi ai
  createdAt?: string; //ngày tạo

  updatedAt?: string; //ngày cập nhật
  idOriginPaper?: number; //phôi gốc
  idSupplier?: number; //nhà cung cấp phôi

  onlyPrintLid?: number; // chi in nắp

  selectedType?: number | null,
  selectedWave?: string | null,
  selectedColor?: string | null,
  selectedPrice?: number | null,
  selectedQuantitative?: string | null,

  printTypeMap?: Record<string, PrintType>;
  printTypeMapM1?: Record<string, PrintType>;
  printTypeMapM2?: Record<string, PrintType>;
  cocKhuons?: CocKhuon[];
  steps?: CongDoan[];
  idCoverInside?: string;
  availablePaper?: boolean; //Phôi có sẵn hay không có sẵn
  availablePaperMap?: Record<string, boolean>; //map theo từng số lượng khác nhau
  availablePaperMapM1?: Record<string, boolean>; //map theo từng số lượng khác nhau
  availablePaperMapM2?: Record<string, boolean>; //map theo từng số lượng khác nhau
  widthPrint?: number;
  longPrint?: number;

  isApprove?: boolean;
  approvedBy?: number;

  mapPriceCanlan?: QuantityPriceMap;
  mapPriceXaPhoi?: QuantityPriceMap;
  multipleAvailablePaper?: number; //hệ số phôi sẵn %
  multipleTotal?: QuantityPriceMap;
  isPlusPriceMold?: boolean;
  isPlusPricePrint?: boolean;

  // Thông số tính IN theo mặt ngoài - mặt trong- nắp gài
  printTypeMapOutside?: Record<string, PrintType>;
  printTypeMapInside?: Record<string, PrintType>;
  //TH đối với in mặt ngoài/mặt trong - nắp gài
  printOutside?: OutInBox;
  printInside?: OutInBox;

  // Thông số tính IN theo mặt ngoài - mặt trong - hộp 2 mảnh - nắp gài
  printTypeMapM1Outside?: Record<string, PrintType>;
  printTypeMapM1Inside?: Record<string, PrintType>;
  printTypeMapM2Outside?: Record<string, PrintType>;

  printM1Outside?: OutInBox;
  printM1Inside?: OutInBox;
  printM2Outside?: OutInBox;

  resultPrice?: ResultPrice[];

  //Loại màu in
  typeColorPrint?: string | "default" | "white";
  multipleColorPrint?: number;

  plusAvailablePriceKhuon?: number; // cộng thêm giá khi khuôn có sẵn
  priceSubsidyKhuon?: number; // trợ giá khi không có sẵn khuôn
  priceSubsidyPrint?: number; // trợ giá bản in

  typeDanGhimTurnM2?: string; //TURN:  theo lượt, M2: theo m2
  typeBocleTurnM2?: string; //TURN:  theo lượt, M2: theo m2
  typeXaPhoiTurnM2?: string; //TURN:  theo lượt, M2: theo m2
  typeCanlanTurnM2?: string; //TURN:  theo lượt, M2: theo m2
}

type CongDoan = {
  id: number;
  name: string;
  count: number;
  price: number;
  type?: number; //tính theo loại nào 1: lượt, 2: m2, 3: giá
};
type PrintType = "silk" | "flexo";

export interface OutInBox {
  numColorPrint?: number; //số màu in,
  hesoIN?: number; //hệ số in dựa trên diện tích mảnh
  priceFlexoDesign?: number | string; //giá in flexo Thiết kế 
  priceFlexo?: number | string; //giá in flexo
  minPrintFlexo?: number; //giá min in flexo
}

export interface PieceBox {
  mayBeId?: number | string;
  idKhobe?: number | string;
  priceBe?: number;
  minBe?: number;
  numBatBe?: number;
  idInOut?: string | number; // in mặt trong hay ngoài
  idPrintFaceIn?: string | number; //in mặt trong
  idPrintFaceOut?: string | number; //in mặt ngoài
  acreagePrintFace?: number; //diện tích in mặt
  isPrintLid?: string; // in nắp hay không
  numColorPrint?: number; //số màu in,
  hesoIN?: number; //hệ số in dựa trên diện tích mảnh
  priceFlexoDesign?: number | string; //giá in flexo Thiết kế 
  priceFlexo?: number | string; //giá in flexo
  minPrintFlexo?: number; //giá min in flexo
  idPrint?: string | number; // có in mảnh 1 hay 2 không

  onlyPrintLid?: number;
}

export interface QuantityPriceMap {
  [quantity: string]: number; // hoặc [quantity: number]: number;
}

export interface CustomerCRM {
  id?: number | string;
  name?: string;
  phone?: string;
  address?: string;
  note?: string;
}

export interface PriceFilter {
  createdAt?: Date | {
    $gte?: Date;
    $lte?: Date;
  } | null;
  location?: string;
  createdBy?: number;
  madeByUser?: number;
  statusLevel?: string | number;
  size?: string;
  selectedType?: number;
  selectedWave?: string;
  status?: string;

  typebox?: string | null;
  idPrint?: string | null;
  idBoBe?: null | string;
  activeDanGhim?: boolean | null;
  activeBocLe?: boolean | null;
  activeCanBongThuong?: boolean | null;
  activeCanLan?: boolean | null;
  activeXaPhoi?: boolean | null;
  idDanGhim?: string | null;
}

export interface ResultPrice {
  quantity?: number;
  totalPricePhoi?: number;
  totalBochap?: number;
  totalBe?: number;
  totalDanGhim?: number;
  totalCanlan?: number;
  totalXaPhoi?: number;
  totalBocLeBo?: number;
  totalINlua?: number;
  totalFlexo?: number;
  totalCanbong?: number;
  totalPriceKhuon?: number;
  totalCongDoan?: number;
  totalAll?: number;
  priceOnlyOne?: number;
  totalMultiple?: number;
  adjustTotalMultiple?: number;
  priceToCustomer?: number;
  adjustPriceToCustomer?: number;
  priceFlexoDesign?: number;
  priceFlexoDesignM1?: number;
  priceFlexoDesignM2?: number;

  totalAllInLua?: number; // tổng giá toàn bộ công đoạn với in lụa
  totalAllInFlexo?: number; // tổng giá toàn bộ công đoạn với in flexo
  priceToCustomerInLua?: number;
  priceToCustomerInFlexo?: number;
  multipleTotalInLua?: number;
  multipleTotalInFlexo?: number;

  hideLua?: boolean;   // ẩn giá in lụa
  hideFlexo?: boolean; // ẩn giá in flexo

  priceSubsidyKhuon?: number; // trợ giá khi không có sẵn khuôn
  priceSubsidyPrint?: number; // trợ giá bản in
}

export const optionsTypeTurnM2 = [
  { label: "lượt", value: "lượt" },
  { label: "m2", value: "m2" },
  { label: "giá", value: "giá" },
]
