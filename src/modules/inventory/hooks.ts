import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  type Product,
  type ProductFilter,
  type ProductFormData,
  ProductStatus,
  type PaginatedProducts,
} from "./types";

// ---------------------------------------------------------------------------
// Mock data store (replace with real API calls)
// ---------------------------------------------------------------------------

let MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Wireless Noise-Cancelling Headphones",
    sku: "ELC-WNC-001",
    category: "Electronics",
    stockQty: 142,
    price: 299.99,
    status: ProductStatus.IN_STOCK,
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-03-15T14:23:00Z",
  },
  {
    id: "2",
    name: "Ergonomic Office Chair",
    sku: "FUR-EOC-002",
    category: "Furniture",
    stockQty: 8,
    price: 549.0,
    status: ProductStatus.LOW_STOCK,
    createdAt: "2024-01-12T10:00:00Z",
    updatedAt: "2024-03-14T08:00:00Z",
  },
  {
    id: "3",
    name: "Organic Green Tea (50 bags)",
    sku: "FNB-OGT-003",
    category: "Food & Beverage",
    stockQty: 0,
    price: 12.99,
    status: ProductStatus.OUT_OF_STOCK,
    createdAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-03-13T16:00:00Z",
  },
  {
    id: "4",
    name: "Running Shoes - Men's Size 10",
    sku: "SPT-RSM-004",
    category: "Sports",
    stockQty: 35,
    price: 129.99,
    status: ProductStatus.IN_STOCK,
    createdAt: "2024-01-20T12:00:00Z",
    updatedAt: "2024-03-12T10:00:00Z",
  },
  {
    id: "5",
    name: "Ballpoint Pens (12-pack)",
    sku: "OFS-BPP-005",
    category: "Office Supplies",
    stockQty: 6,
    price: 8.49,
    status: ProductStatus.LOW_STOCK,
    createdAt: "2024-01-22T13:00:00Z",
    updatedAt: "2024-03-11T11:00:00Z",
  },
  {
    id: "6",
    name: "Vitamin C Serum 30ml",
    sku: "HLB-VCS-006",
    category: "Health & Beauty",
    stockQty: 220,
    price: 45.0,
    status: ProductStatus.IN_STOCK,
    createdAt: "2024-02-01T09:30:00Z",
    updatedAt: "2024-03-10T09:00:00Z",
  },
  {
    id: "7",
    name: "4K Webcam",
    sku: "ELC-4KW-007",
    category: "Electronics",
    stockQty: 0,
    price: 189.0,
    status: ProductStatus.OUT_OF_STOCK,
    createdAt: "2024-02-05T10:00:00Z",
    updatedAt: "2024-03-09T15:00:00Z",
  },
  {
    id: "8",
    name: "LEGO Technic Set",
    sku: "TOY-LGT-008",
    category: "Toys",
    stockQty: 57,
    price: 74.99,
    status: ProductStatus.IN_STOCK,
    createdAt: "2024-02-08T11:00:00Z",
    updatedAt: "2024-03-08T14:00:00Z",
  },
  {
    id: "9",
    name: "Men's Slim Fit Chinos",
    sku: "CLT-MSC-009",
    category: "Clothing",
    stockQty: 3,
    price: 59.99,
    status: ProductStatus.LOW_STOCK,
    createdAt: "2024-02-10T12:00:00Z",
    updatedAt: "2024-03-07T13:00:00Z",
  },
  {
    id: "10",
    name: "Dash Cam 1080p",
    sku: "AUT-DCM-010",
    category: "Automotive",
    stockQty: 18,
    price: 89.99,
    status: ProductStatus.IN_STOCK,
    createdAt: "2024-02-12T09:00:00Z",
    updatedAt: "2024-03-06T12:00:00Z",
  },
  {
    id: "11",
    name: "Mechanical Keyboard TKL",
    sku: "ELC-MKT-011",
    category: "Electronics",
    stockQty: 44,
    price: 149.0,
    status: ProductStatus.IN_STOCK,
    createdAt: "2024-02-14T10:30:00Z",
    updatedAt: "2024-03-05T10:00:00Z",
  },
  {
    id: "12",
    name: "Yoga Mat (6mm)",
    sku: "SPT-YGM-012",
    category: "Sports",
    stockQty: 0,
    price: 34.99,
    status: ProductStatus.OUT_OF_STOCK,
    createdAt: "2024-02-16T11:00:00Z",
    updatedAt: "2024-03-04T09:00:00Z",
  },
];

let nextId = 13;

function deriveStatus(qty: number): ProductStatus {
  if (qty === 0) return ProductStatus.OUT_OF_STOCK;
  if (qty <= 10) return ProductStatus.LOW_STOCK;
  return ProductStatus.IN_STOCK;
}

// Simulate network delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// API functions (swap these for real fetch/axios calls)
// ---------------------------------------------------------------------------

async function fetchProducts(filter: ProductFilter): Promise<PaginatedProducts> {
  await delay(400);

  const filtered = MOCK_PRODUCTS.filter((p) => {
    const matchesSearch =
      filter.search === "" ||
      p.name.toLowerCase().includes(filter.search.toLowerCase()) ||
      p.sku.toLowerCase().includes(filter.search.toLowerCase());

    const matchesCategory =
      filter.category === "" || p.category === filter.category;

    const matchesStatus =
      filter.status === "ALL" || p.status === filter.status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const total = filtered.length;
  const start = (filter.page - 1) * filter.pageSize;
  const data = filtered.slice(start, start + filter.pageSize);

  return {
    data,
    total,
    page: filter.page,
    pageSize: filter.pageSize,
    totalPages: Math.ceil(total / filter.pageSize),
  };
}

async function createProduct(data: ProductFormData): Promise<Product> {
  await delay(500);
  const product: Product = {
    ...data,
    id: String(nextId++),
    status: deriveStatus(data.stockQty),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  MOCK_PRODUCTS = [product, ...MOCK_PRODUCTS];
  return product;
}

async function updateProduct(
  id: string,
  data: Partial<ProductFormData>
): Promise<Product> {
  await delay(500);
  MOCK_PRODUCTS = MOCK_PRODUCTS.map((p) => {
    if (p.id !== id) return p;
    const updated = {
      ...p,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    updated.status = deriveStatus(updated.stockQty);
    return updated;
  });
  const found = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!found) throw new Error("Product not found");
  return found;
}

async function deleteProduct(id: string): Promise<void> {
  await delay(400);
  MOCK_PRODUCTS = MOCK_PRODUCTS.filter((p) => p.id !== id);
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (filter: ProductFilter) => [...inventoryKeys.lists(), filter] as const,
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

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductFormData) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
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
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
    },
  });
}