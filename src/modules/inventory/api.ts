import { api } from "@/services/api-client";
import type {
  InventoryOverview,
  Product,
  ProductFilter,
  ProductFormData,
  PaginatedProducts,
} from "./types";

export async function fetchProducts(filter: ProductFilter): Promise<PaginatedProducts> {
  const response = await api.get<PaginatedProducts>("/inventory", {
    params: {
      search: filter.search,
      category: filter.category,
      brand: filter.brand,
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
    },
  });
  return response.data;
}

export async function fetchInventoryOverview(): Promise<InventoryOverview> {
  const response = await api.get<InventoryOverview>("/inventory/overview");
  return response.data;
}

export async function createProduct(data: ProductFormData): Promise<Product> {
  const { status, createdAt, updatedAt, ...payload } = data as Product & ProductFormData;
  const response = await api.post<Product>("/inventory", payload);
  return response.data;
}

export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>
): Promise<Product> {
  const { status, createdAt, updatedAt, ...payload } = data as Product & ProductFormData;
  const response = await api.patch<Product>(`/inventory/${id}`, payload);
  return response.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/inventory/${id}`);
}
