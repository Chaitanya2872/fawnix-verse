import { api } from "@/services/api-client";
import type {
  InventoryOverview,
  Product,
  ProductFilter,
  ProductFormData,
  PaginatedProducts,
  InventoryTransactionListResponse,
  InventoryTransaction,
  StockAdjustmentPayload,
} from "./types";
import { getApiErrorMessage } from "@/services/api-client";

function rethrow(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchProducts(filter: ProductFilter): Promise<PaginatedProducts> {
  try {
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
  } catch (error) {
    rethrow(error, "Failed to load inventory items.");
  }
}

export async function fetchInventoryOverview(): Promise<InventoryOverview> {
  try {
    const response = await api.get<InventoryOverview>("/inventory/overview");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load inventory overview.");
  }
}

export async function createProduct(data: ProductFormData): Promise<Product> {
  try {
    const { status, createdAt, updatedAt, ...payload } = data as Product & ProductFormData;
    const response = await api.post<Product>("/inventory", payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create inventory item.");
  }
}

export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>
): Promise<Product> {
  try {
    const { status, createdAt, updatedAt, ...payload } = data as Product & ProductFormData;
    const response = await api.patch<Product>(`/inventory/${id}`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update inventory item.");
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await api.delete(`/inventory/${id}`);
  } catch (error) {
    rethrow(error, "Failed to delete inventory item.");
  }
}

export async function fetchTransactions(): Promise<InventoryTransactionListResponse> {
  try {
    const response = await api.get<InventoryTransactionListResponse>("/inventory/transactions");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load inventory transactions.");
  }
}

export async function receiveStock(productId: string, payload: StockAdjustmentPayload): Promise<InventoryTransaction> {
  try {
    const response = await api.post<InventoryTransaction>(`/inventory/transactions/products/${productId}/receive`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to receive stock.");
  }
}

export async function consumeStock(productId: string, payload: StockAdjustmentPayload): Promise<InventoryTransaction> {
  try {
    const response = await api.post<InventoryTransaction>(`/inventory/transactions/products/${productId}/consume`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to consume stock.");
  }
}
