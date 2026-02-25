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
  stockQty: number;
  price: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductFormData = Omit<Product, "id" | "createdAt" | "updatedAt">;

export interface ProductFilter {
  search: string;
  category: string;
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

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Clothing",
  "Food & Beverage",
  "Office Supplies",
  "Furniture",
  "Health & Beauty",
  "Sports",
  "Toys",
  "Automotive",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];