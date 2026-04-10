import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  type ProductFilter,
  type ProductFormData,
} from "./types";
import {
  createProduct,
  deleteProduct,
  fetchInventoryOverview,
  fetchProducts,
  updateProduct,
} from "./api";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (filter: ProductFilter) => [...inventoryKeys.lists(), filter] as const,
  overview: () => [...inventoryKeys.all, "overview"] as const,
};

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

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductFormData) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
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
    },
  });
}
