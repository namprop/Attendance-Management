import { FileInfos } from "@/app/data/dataMold";
import { User } from "@/app/data/dataUser";
import { InfoOrderData } from "@/app/data/interface/transaction";
import { Branch } from "@/app/data/interface/branchArea";

export type Product__StockStatus_DBType = Product__StockStatusTier & {
  [key: string]: unknown;
};
export type Product__StockStatusCreate_DBType = Omit<
  Product__StockStatusTier,
  "_id"
> & {
  [key: string]: unknown;
};

export type stockStatusFormState = Omit<
  Product__StockStatusTier,
  "minStock" | "maxStock"
>;

export type Branch_DBType = Branch & { [key: string]: unknown };
export type BranchCreate_DBType = Omit<Branch, "_id"> & {
  [key: string]: unknown;
};

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++ QUICK OPTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export type QuickOptionTree_DBType = QuickOptionTree & {
  [key: string]: unknown;
};
export type QuickOptionTreeCreate_DBType = Omit<QuickOptionTree, "_id"> & {
  [key: string]: unknown;
};
export interface QuickOptionTree {
  _id: string;
  parentId?: string;

  // name
  label: string;
  value: string;
}

// Dịnh nghĩa các type DB option
export type QuickOption_DBType = QuickOption & { [key: string]: unknown };
export type QuickOptionCreate_DBType = Omit<QuickOption, "_id"> & {
  [key: string]: unknown;
};
export interface QuickOption {
  _id: string;
  label: string;
  value: string;
}

// ============== Cảnh báo tồn kho
export interface Product__StockStatusTier {
  _id: string;
  name: string;
  color: string;
  minStock: number;
  maxStock: number;
}
// Định nghĩa các type DB user
export type ProductUser = Pick<
  User,
  "id" | "name" | "username" | "status" | "department" | "role"
>;
export type ProductBranchStock = {
  branchId: string;
  stock: number;
  minStock?: number;
  maxStock?: number;
};

export type ProductPlacementLocation = {
  branchId: string;
  location: string;
};

export type ProductLot = {
  importId: string;
  code?: string;
  importedQty: number;
  remainingQty: number;
  costPrice?: number;
  lot?: string;
  importedAt?: string;
  branchId?: string;
  productId?: string;
  createAt?: string;
  updateAt?: string;
};

export type ProductLegacyStockFields = {
  stock?: number;
  priceTiers?: Product__PriceTier[];
  branchStocks?: ProductBranchStock[];
  importId?: string;
  code?: string;
  importedQty?: number;
  remainingQty?: number;
  costPrice?: number;
  lot?: string;
  importedAt?: string;
  branchId?: string;
};
export interface Product_BranchPricingStock {
  branchId: string;
  productId: string;
  stock?: number;
  priceTiers?: Product__PriceTier[];
  createAt?: string;
  updateAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdByName?: string;
  updatedByName?: string;
}
export interface Product_BranchLots {
  _id?: string;
  branchId: string;
  productId: string;
  importId?: string;
  code?: string;
  importedQty?: number;
  remainingQty?: number;
  costPrice?: number;
  lot?: string;
  importedAt?: string;
  // stock?: number;
  createAt?: string;
  updateAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdByName?: string;
  updatedByName?: string;
}
// Dịnh nghĩa các DB type
export interface Product {
  _id: string;
  code: string;
  name?: string;
  symbol?: string;
  businessRegion: string;
  businessRegionName?: string;
  branchIds?: string[];
  placementLocations?: ProductPlacementLocation[];
  liquidation_id?: string;
  fileAttached?: FileInfos[];
  thumbnailUrl?: string; // Ảnh đại diện (URL lấy từ fileAttached)
  description?: string;
  noteProduct?: string;
  isMarked?: boolean;
  saleStatus?: Product__SaleStatus;
  isAdvanced?: boolean;
  // salePrice?: number;
  // costPrice?: number;
  stockStatusTiers: Product__StockStatusTier[];
  unit: string;
  minStock?: number;
  maxStock?: number;

  createdBy?: number;
  createdAt?: string;

  updatedBy?: number;
  updatedAt?: string;

  createdByName?: string;
  updatedByName?: string;

  approveBy?: number;
  approveByName?: string;
  approveAt?: string;

  long?: number;
  width?: number;
  height?: number;
  sizeType?: string;
  selectedLayer?: number;
  selectedWave?: string;
  selectedColor?: string;
  selectedQuantitative?: string;
  selectedTypeFatherProduct: string;
  selectedTypeChildProduct?: string;
  valueTypeFatherProduct?: string;
  valueTypeChildProduct?: string;

  selectedQty?: number;
  originalPrice?: number;
  itemDiscount?: number;
  itemDiscountType?: "VND" | "%";

  productType?: "general" | "premium";
  movementStockNote?: string;
  movementPriceNote?: string;

  // Phân loại thêm
  saleSpeed?: string; // Tốc độ bán hàng: Bán chậm / Bình thường / Bán chạy
  sizeCategory?: string; // Phân loại kích cỡ: Nhỏ / Vừa / To
  goodsCategory?: string; // Phân loại hàng: Sản xuất / ShipCod
  typePrint?: string; // Phân loại in: Có in / Không in
  typeProcessing?: string; // Phân loại gia công: Dán / Không dán / Ghim / Không ghim

  // Link ngược về phôi - liên kết 1-1
  idPaperProduct?: string | null;
  codePaperProduct?: string | null;
}

export type Product__SaleStatus =
  | "Đang bán"
  | "Ngưng bán"
  | "Ngừng Hẳn"
  | "Thanh lý";

export interface Product__PriceTier {
  estimatedQuantity?: number;
  minQuantity: number;
  maxQuantity: number;
  costPrice: number;
  salePrice: number;
}
export type Product_DBType = Product & { [key: string]: unknown };
export type ProductWithLegacy = Product & ProductLegacyStockFields;
export type ProductCreate_DBType = Omit<Product, "_id"> & {
  [key: string]: unknown;
};

export type Product_LotAllocation = {
  importId: string;
  lot: string;
  code?: string;
  importedQty?: number;
  costPrice?: number;
  quantity: number;
};
export interface Product_ExportItem {
  productId: string;
  importId?: string;
  lot?: string | Product_LotAllocation[];
  productCode?: string;
  productName: string;
  quantity: number;
  allocatedQty?: number;
  unallocatedQty?: number;
  pendingAllocation?: boolean;
  costPrice?: number;
  salePrice?: number;
  unit?: string;
  note?: string;
}

export interface Product_Export {
  _id: string;
  exportedAt: string;
  branchId?: string;
  businessRegion?: string;
  fileAttached?: FileInfos[];
  note?: string;
  items: Product_ExportItem[];
  totalQuantity: number;
  createdBy: number;
  createdByName?: string;
  createdAt?: string;
  status?: boolean;
  updatedBy?: number;
  updatedByName?: string;
  updatedAt?: string;
  approveBy?: string;
  approveAt?: string;
  approveByName?: string;
  trashedAt?: string;
  trashedBy?: string;
  trashedByName?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
  recordStatus?: "active" | "trashed" | "deleted";
  pendingAction?: Product_ExportPendingAction;
  pendingData?: Product_ExportPendingUpdate;
  approvalHistory?: Product_ExportApprovalHistoryItem[];
}
export type Product_Export_DBType = Product_Export & { [key: string]: unknown };
export type Product_ExportCreate_DBType = Omit<Product_Export, "_id"> & {
  [key: string]: unknown;
};

export type Product_ExportPendingAction =
  | "create"
  | "trash"
  | "delete"
  | "update"
  | "restore";
export type Product_ExportApprovalAction =
  // | "create_request"
  | "create_approve"
  // | "update_request"
  | "update_approve"
  // | "trash_request"
  | "trash_approve"
  // | "restore_request"
  | "restore_approve"
  // | "delete_request";
  | "delete_approve"
  | "trash_reject"
  | "restore_reject"
  | "delete_reject"
  | "update_reject"
  | "create_reject";
export type Product_ExportApprovalHistoryItem = {
  action: Product_ExportApprovalAction;
  at: string;
  by?: number;
  byName?: string;
  note?: string;
  meta?: Record<string, unknown>;
};
export type Product_ExportPendingUpdate = Partial<
  Pick<
    Product_Export,
    | "exportedAt"
    | "branchId"
    | "businessRegion"
    | "fileAttached"
    | "note"
    | "items"
    | "totalQuantity"
    | "updatedBy"
    | "updatedByName"
    | "updatedAt"
  >
>;

export interface Product_ExportUsageItem {
  productId: string;
  importId?: string;
  lot?: string | Product_LotAllocation[];
  productCode?: string;
  productName: string;
  quantity: number;
  allocatedQty?: number;
  unallocatedQty?: number;
  pendingAllocation?: boolean;
  costPrice?: number;
  salePrice?: number;
  unit?: string;
  note?: string;
}

export interface Product_ExportUsage {
  _id: string;
  exportedAt: string;
  branchId?: string;
  businessRegion?: string;
  fileAttached?: FileInfos[];
  note?: string;
  items: Product_ExportUsageItem[];
  totalQuantity: number;
  createdBy: number;
  createdByName?: string;
  createdAt?: string;
  status?: boolean;
  updatedBy?: number;
  updatedByName?: string;
  updatedAt?: string;
  approveBy?: string;
  approveAt?: string;
  approveByName?: string;
  trashedAt?: string;
  trashedBy?: string;
  trashedByName?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
  recordStatus?: "active" | "trashed" | "deleted";
  pendingAction?: Product_ExportUsagePendingAction;
  pendingData?: Product_ExportUsagePendingUpdate;
  approvalHistory?: Product_ExportUsageApprovalHistoryItem[];
}
export type Product_ExportUsage_DBType = Product_ExportUsage & {
  [key: string]: unknown;
};
export type Product_ExportUsageCreate_DBType = Omit<
  Product_ExportUsage,
  "_id"
> & {
  [key: string]: unknown;
};

export type Product_ExportUsagePendingAction =
  | "create"
  | "trash"
  | "delete"
  | "update"
  | "restore";
export type Product_ExportUsageApprovalAction =
  | "create_approve"
  | "update_approve"
  | "trash_approve"
  | "restore_approve"
  | "delete_approve"
  | "trash_reject"
  | "restore_reject"
  | "delete_reject"
  | "update_reject"
  | "create_reject"
  | "create_request"
  | "update_request"
  | "trash_request"
  | "restore_request"
  | "delete_request";
export type Product_ExportUsageApprovalHistoryItem = {
  action: Product_ExportUsageApprovalAction;
  at: string;
  by?: number;
  byName?: string;
  note?: string;
  meta?: Record<string, unknown>;
};
export type Product_ExportUsagePendingUpdate = Partial<
  Pick<
    Product_ExportUsage,
    | "exportedAt"
    | "branchId"
    | "businessRegion"
    | "fileAttached"
    | "note"
    | "items"
    | "totalQuantity"
    | "updatedBy"
    | "updatedByName"
    | "updatedAt"
  >
>;

// interface kiểm kho sản phẩm
export interface Product_CheckItem {
  productId: string;
  productCode?: string;
  productName?: string;
  unit?: string;
  systemStock: number;
  goodStock?: number;
  damagedStock?: number;
  countedStock: number;
  note?: string;
}

export interface Product_Check {
  _id: string;
  code?: string;
  checkedAt: string;
  branchId?: string;
  businessRegion?: string;
  mainReceiver?: string;
  subReceiver?: string;
  inspector?: string;
  fileAttached?: FileInfos[];
  note?: string;
  confirmed?: boolean;
  items: Product_CheckItem[];
  totalItems: number;
  totalDiff: number;
  createdBy: number;
  createdByName?: string;
  createdAt?: string;
  approveBy?: string;
  approveAt?: string;
  approveByName?: string;
  rejectedAt?: string | null;
  rejectedBy?: number;
  rejectedByName?: string;
  rejectedReason?: string;
  trashedAt?: string | null;
  trashedBy?: string | null;
  trashedByName?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedByName?: string | null;
  pendingAction?:
    | "create"
    | "update"
    | "trash"
    | "restore"
    | "delete"
    | string
    | null;
  pendingData?: Partial<Product_Check> | null;
  approvalHistory?: Array<{
    action: string;
    at: string;
    by?: number;
    byName?: string;
    note?: string;
    meta?: Record<string, unknown>;
  }>;
}

export type Product_Check_DBType = Product_Check & { [key: string]: unknown };
export type Product_CheckCreate_DBType = Omit<Product_Check, "_id"> & {
  [key: string]: unknown;
};

export type Product_LiquidationApprovalHistoryItem = {
  action: string;
  at: string;
  by?: number;
  byName?: string;
};

export interface Product_Liquidation {
  _id: string;
  code?: string;
  liquidatedAt: string;
  oldProductId: string;
  oldProductCode?: string;
  oldProductName?: string;
  newProductId: string;
  newProductCode?: string;
  newProductName?: string;
  importId?: string;
  lot?: string | Product_LotAllocation[];
  quantity: number;
  allocatedQty?: number;
  unallocatedQty?: number;
  pendingAllocation?: boolean;
  priceTiers?: Product__PriceTier[];
  branchId?: string;
  businessRegion?: string;
  fileAttached?: FileInfos[];
  note?: string;
  createdBy: number;
  createdByName?: string;
  createdAt?: string;
  updatedBy?: number;
  updatedByName?: string;
  updatedAt?: string;
  approveBy?: string;
  approveAt?: string;
  approveByName?: string;
  trashedAt?: string;
  trashedBy?: string;
  trashedByName?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
  recordStatus?: "active" | "trashed" | "deleted";
  pendingAction?: string;
  pendingData?: Record<string, unknown> | null;
  approvalHistory?: Product_LiquidationApprovalHistoryItem[];
}
export type Product_Liquidation_DBType = Product_Liquidation & {
  [key: string]: unknown;
};
export type Product_LiquidationCreate_DBType = Omit<
  Product_Liquidation,
  "_id"
> & {
  [key: string]: unknown;
};

// Product
export type ProductPageFormState_DBType = Product & { [key: string]: unknown };
export type ProductPageFormStateCreate_DBType = Omit<Product, "_id"> & {
  [key: string]: unknown;
};

// PriceMovement
export type Product_PriceMovement_DBType = Product__PriceMovement & {
  [key: string]: unknown;
};
export type Product_PriceMovementCreate_DBType = Omit<
  Product__PriceMovement,
  "_id"
> & {
  [key: string]: unknown;
};
export type Product__PriceMovement__TransactionType =
  | "Initial"
  | "ManualAdjustment"
  | "SystemUpdate"
  | "Reversion";
export type Product__PriceMovement__ImpactType = string;
export interface Product__PriceMovement {
  _id: string;
  productId: string;
  productName: string;
  branchId?: string;
  transactionRefId: string;
  movementDateTime: string;
  oldPriceTiersSnapshot: Product__PriceTier[];
  newPriceTiersSnapshot: Product__PriceTier[];
  productSnapshot: Product;
  impactType?: Product__PriceMovement__ImpactType;
  note?: string;
  createdBy: number;
  createdByName?: string;
  transactionType: Product__PriceMovement__TransactionType;
}

export type Product_StockMovement_DBType = Product_StockMovement & {
  [key: string]: unknown;
};
export type Product_StockMovementCreate_DBType = Omit<
  Product_StockMovement,
  "_id"
> & {
  [key: string]: unknown;
};
export type Product__StockMovementType =
  | "IN_NEW"
  | "OUT_SALE"
  | "OUT_CANCEL"
  | "OUT_USAGE"
  | "ADJUSTMENT"
  | "MIN_MAX_ADJUST"
  | "REVERSION";
export type Product__StockMovement__TransactionType =
  | "Invoice"
  | "ProductManagement";
export interface Product_StockMovement {
  _id: string;
  productId: string;
  productName: string;

  movementType: Product__StockMovementType;
  quantityChange: number;
  transactionRefId: string;
  transactionType: Product__StockMovement__TransactionType;
  importId?: string;
  lot?: string | Product_LotAllocation[] | undefined;
  costPrice?: number;
  branchId?: string;

  snapshotData: InfoOrderData | Partial<Product>;
  movementDateTime: string;
  stockBefore: number;
  stockAfter: number;

  minStockAtTime: number;
  maxStockAtTime: number;

  note?: string;
  createdBy: number;
  createdByName?: string;
  createAt?: string;
  updateAt?: string;
}

export async function createStockStatus(
  data: stockStatusFormState,
): Promise<stockStatusFormState> {
  // Mock function due to missing callApi
  return data;
}

export interface Product_Transfer {
  _id: string;
  code?: string;
  transferredAt: string;
  oldProductId: string;
  oldProductCode?: string;
  oldProductName?: string;
  newProductId: string;
  newProductCode?: string;
  newProductName?: string;
  fromBranchId?: string;
  toBranchId?: string;
  importId?: string;
  lot?: string | Product_LotAllocation[];
  allocatedQty?: number;
  unallocatedQty?: number;
  pendingAllocation?: boolean;
  toImportId?: string;
  toLot?: string;
  quantity: number;
  priceTiers?: Product__PriceTier[];
  businessRegion?: string;
  fileAttached?: FileInfos[];
  note?: string;
  createdBy: number;
  createdByName?: string;
  createdAt?: string;
  updatedBy?: number;
  updatedByName?: string;
  updatedAt?: string;
  pendingAction?: "create" | "update" | "trash" | "restore" | "delete" | null;
  pendingData?: Record<string, unknown> | null;
  trashedAt?: string | null;
  deletedAt?: string | null;
  recordStatus?: "active" | "trashed" | "deleted";
  approveBy?: string | number;
  approveAt?: string;
  approveByName?: string;
  approvalHistory?: Array<{
    action: string;
    at: string;
    by?: number;
    byName?: string;
  }>;
}
export type Product_Transfer_DBType = Product_Transfer & {
  [key: string]: unknown;
};
export type Product_TransferCreate_DBType = Omit<Product_Transfer, "_id"> & {
  [key: string]: unknown;
};
