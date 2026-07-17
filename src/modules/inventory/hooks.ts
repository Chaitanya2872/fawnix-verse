import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  type ProductFilter,
  ProductStatus,
  type Product,
  type ProductFormData,
  type InventoryTransaction,
  type InventoryTransactionListResponse,
  type PaginatedProducts,
  type StockAdjustmentPayload,
  type WarehouseFilter,
  type WarehouseFormData,
} from "./types";
import {
  consumeStock,
  createProduct,
  createWarehouse,
  deleteProduct,
  deleteWarehouse,
  fetchInventoryOverview,
  fetchProducts,
  fetchTransactions,
  fetchWarehouses,
  importProducts,
  previewProductImport,
  receiveStock,
  updateProduct,
  updateWarehouse,
} from "./api";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (filter: ProductFilter) => [...inventoryKeys.lists(), filter] as const,
  overview: () => [...inventoryKeys.all, "overview"] as const,
  transactions: () => [...inventoryKeys.all, "transactions"] as const,
  warehouses: () => [...inventoryKeys.all, "warehouses"] as const,
  warehouseList: (filter: WarehouseFilter) => [...inventoryKeys.warehouses(), filter] as const,
};

function getStatusFromStock(product: Product, stockQty: number) {
  const reorderLevel = Number(product.reorderLevel ?? 0);
  if (stockQty <= 0) return ProductStatus.OUT_OF_STOCK;
  if (reorderLevel > 0 && stockQty <= reorderLevel) return ProductStatus.LOW_STOCK;
  return ProductStatus.IN_STOCK;
}

function patchProductStock(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  quantity: number,
  mode: "consume" | "receive"
) {
  queryClient.setQueriesData<PaginatedProducts>({ queryKey: inventoryKeys.lists() }, (current) => {
    if (!current?.data || !Array.isArray(current.data)) return current;
    return {
      ...current,
      data: current.data.map((product: Product) => {
        if (product.id !== productId) return product;
        const currentStock = Number(product.stockQty ?? 0);
        const nextStock = mode === "consume" ? currentStock - quantity : currentStock + quantity;
        return {
          ...product,
          stockQty: nextStock,
          status: getStatusFromStock(product, nextStock),
        };
      }),
    };
  });
}

function prependTransaction(
  queryClient: ReturnType<typeof useQueryClient>,
  transaction: InventoryTransaction
) {
  queryClient.setQueryData<InventoryTransactionListResponse>(inventoryKeys.transactions(), (current) => {
    if (!current?.data || !Array.isArray(current.data)) {
      return { data: [transaction] };
    }
    return {
      ...current,
      data: [transaction, ...current.data],
    };
  });
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useProducts(filter: ProductFilter) {
  return useQuery({
    queryKey: inventoryKeys.list(filter),
    queryFn: () => fetchProducts(filter),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useInventoryOverview() {
  return useQuery({
    queryKey: inventoryKeys.overview(),
    queryFn: fetchInventoryOverview,
    staleTime: 30_000,
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: inventoryKeys.transactions(),
    queryFn: fetchTransactions,
    staleTime: 15_000,
  });
}

export function useWarehouses(filter: WarehouseFilter) {
  return useQuery({
    queryKey: inventoryKeys.warehouseList(filter),
    queryFn: () => fetchWarehouses(filter),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductFormData) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductFormData> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions() });
    },
  });
}

export function usePreviewProductImport() {
  return useMutation({
    mutationFn: (file: File) => previewProductImport(file),
  });
}

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importProducts(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
    },
  });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: StockAdjustmentPayload }) =>
      receiveStock(productId, data),
    onSuccess: (transaction, variables) => {
      patchProductStock(queryClient, variables.productId, variables.data.quantity, "receive");
      prependTransaction(queryClient, transaction);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions() });
    },
  });
}

export function useConsumeStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: StockAdjustmentPayload }) =>
      consumeStock(productId, data),
    onSuccess: (transaction, variables) => {
      patchProductStock(queryClient, variables.productId, variables.data.quantity, "consume");
      prependTransaction(queryClient, transaction);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions() });
    },
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WarehouseFormData) => createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.warehouses() });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WarehouseFormData> }) =>
      updateWarehouse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.warehouses() });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.warehouses() });
    },
  });
}
