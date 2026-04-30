export const ProductStatus = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  subCategory?: string | null;
  brand?: string | null;
  unit?: string | null;
  reorderLevel?: number | null;
  description?: string | null;
  hsnCode?: string | null;
  notes?: string | null;
  stockQty: number;
  price: number;
  priceTier1?: number | null;
  priceTier2?: number | null;
  priceTier3?: number | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductFormData = Omit<Product, "id" | "createdAt" | "updatedAt">;

export interface ProductFilter {
  search: string;
  category: string;
  brand: string;
  status: ProductStatus | "ALL";
  page: number;
  pageSize: number;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventoryCategorySummary {
  category: string;
  productCount: number;
  brandCount: number;
  totalStockQty: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryBrandSummary {
  brand: string;
  productCount: number;
  categoryCount: number;
  totalStockQty: number;
}

export interface InventoryConsumptionSummary {
  outwardTransactionCount: number;
  consumedQuantity: number;
  lastConsumedOn?: string | null;
}

export interface InventoryConsumptionItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  brand?: string | null;
  txnDate: string;
  quantity: number;
  projectRef?: string | null;
  issuedBy?: string | null;
  notes?: string | null;
}

export interface InventoryOverview {
  totalProducts: number;
  totalCategories: number;
  totalBrands: number;
  totalStockQty: number;
  categories: InventoryCategorySummary[];
  brands: InventoryBrandSummary[];
  consumption: InventoryConsumptionSummary;
  recentConsumption: InventoryConsumptionItem[];
}

export const PRODUCT_CATEGORY_GROUPS = {
  "Smart Switches": ["Touch Panel", "Edge Panel", "Multi-Function"],
  Automation: ["Sensors", "Controllers", "Curtain", "Lighting"],
  CCTV: ["Dome Camera", "Bullet Camera", "IP Camera", "NVR/DVR", "Accessories"],
  Networking: ["Switches", "Access Points", "Cables & Jacks", "Racks", "Dongles"],
  "Access Control": ["Smart Locks", "Video Door Phone", "Door Bell"],
  "Gate Automation": ["Gate Motor"],
  Storage: ["Hard Disk"],
  "Smart Home": ["Voice Assistants"],
  "Home Theater": ["AV Components"],
  "Water Automation": ["Controllers"],
  Services: ["Installation"],
  Other: ["General"],
} as const;

export const PRODUCT_CATEGORIES = Object.keys(PRODUCT_CATEGORY_GROUPS) as Array<
  keyof typeof PRODUCT_CATEGORY_GROUPS
>;

export const INVENTORY_PRICE_LABELS = {
  defaultPrice: "Default Price",
  priceTier1: "Price 1",
  priceTier2: "Price 2",
  priceTier3: "Price 3",
} as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const INVENTORY_TRANSACTION_TYPES = [
  "RECEIVED",
  "CONSUMED",
  "INWARD",
  "OUTWARD",
  "OPENING",
] as const;

export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number];

export interface InventoryTransaction {
  id: string;
  sku: string;
  productName: string;
  txnRef: string;
  txnDate: string;
  txnType: InventoryTransactionType;
  vendorName?: string | null;
  quantity: number;
  unitPrice?: number | null;
  lineTotal?: number | null;
  projectRef?: string | null;
  issuedBy?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InventoryTransactionListResponse {
  data: InventoryTransaction[];
}

export interface StockAdjustmentPayload {
  quantity: number;
  notes?: string;
  projectRef?: string;
  issuedBy?: string;
  vendorName?: string;
}
