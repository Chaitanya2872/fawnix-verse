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
  PaginatedWarehouses,
  Warehouse,
  WarehouseFilter,
  WarehouseFormData,
  ProductImportPreviewResult,
  ProductImportResult,
} from "./types";
import { getApiErrorMessage } from "@/services/api-client";

function rethrow(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

function toProductPayload(data: Partial<ProductFormData>): Partial<ProductFormData> {
  return {
    name: data.name,
    sku: data.sku,
    category: data.category,
    subCategory: data.subCategory,
    brand: data.brand,
    unit: data.unit,
    reorderLevel: data.reorderLevel,
    description: data.description,
    hsnCode: data.hsnCode,
    notes: data.notes,
    stockQty: data.stockQty,
    price: data.price,
    priceTier1: data.priceTier1,
    priceTier2: data.priceTier2,
    priceTier3: data.priceTier3,
    storageMappings: data.storageMappings?.map((mapping) => ({
      id: mapping.id,
      warehouseId: mapping.warehouseId,
      storageLocationId: mapping.storageLocationId,
      quantityOnHand: mapping.quantityOnHand,
      minStockLevel: mapping.minStockLevel,
      maxStockLevel: mapping.maxStockLevel,
      primaryMapping: mapping.primaryMapping,
      notes: mapping.notes,
    })),
  };
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
    const payload = toProductPayload(data);
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
    const payload = toProductPayload(data);
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

export async function downloadProductImportTemplate(): Promise<Blob> {
  try {
    const response = await api.get("/inventory/import/template", {
      responseType: "blob",
    });
    return response.data as Blob;
  } catch (error) {
    rethrow(error, "Failed to download the inventory import template.");
  }
}

export async function previewProductImport(file: File): Promise<ProductImportPreviewResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ProductImportPreviewResult>("/inventory/import/preview", formData);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to validate the inventory import file.");
  }
}

export async function importProducts(file: File): Promise<ProductImportResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ProductImportResult>("/inventory/import", formData);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to import inventory items.");
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

export async function fetchWarehouses(filter: WarehouseFilter): Promise<PaginatedWarehouses> {
  try {
    const response = await api.get<PaginatedWarehouses>("/inventory/warehouses", {
      params: {
        search: filter.search,
        status: filter.status,
        page: filter.page,
        pageSize: filter.pageSize,
      },
    });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load warehouses.");
  }
}

export async function createWarehouse(data: WarehouseFormData): Promise<Warehouse> {
  try {
    const response = await api.post<Warehouse>("/inventory/warehouses", data);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create warehouse.");
  }
}

export async function updateWarehouse(
  id: string,
  data: Partial<WarehouseFormData>
): Promise<Warehouse> {
  try {
    const response = await api.patch<Warehouse>(`/inventory/warehouses/${id}`, data);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update warehouse.");
  }
}

export async function deleteWarehouse(id: string): Promise<void> {
  try {
    await api.delete(`/inventory/warehouses/${id}`);
  } catch (error) {
    rethrow(error, "Failed to delete warehouse.");
  }
}
