"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CreateOrderDrawer,
  OrderDetailDrawer,
  SalesOrdersQueueCard,
} from "./components";
import {
  useCreateSalesOrder,
  useSalesOrder,
  useSalesOrders,
  useUpdateSalesOrderStatus,
} from "./hooks";
import {
  SalesOrderStatus,
  type CreateSalesOrderInput,
  type ManualOrderFormState,
  type ManualOrderItemDraft,
  type SalesOrderFilter,
  type SalesOrderSummary,
} from "./types";

const PAGE_SIZE = 50;

const DRAWER_STATUS_OPTIONS: SalesOrderStatus[] = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.PENDING_APPROVAL,
  SalesOrderStatus.APPROVED,
  SalesOrderStatus.PROCESSING,
  SalesOrderStatus.PACKED,
  SalesOrderStatus.SHIPPED,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.CLOSED,
  SalesOrderStatus.CANCELLED,
];

const QUEUE_TABS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

type QueueTabKey = (typeof QUEUE_TABS)[number]["key"];

const DRAFT_TAB_STATUSES: readonly SalesOrderStatus[] = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.PENDING_APPROVAL,
];

const PROCESSING_TAB_STATUSES: readonly SalesOrderStatus[] = [
  SalesOrderStatus.APPROVED,
  SalesOrderStatus.PROCESSING,
  SalesOrderStatus.PACKED,
  SalesOrderStatus.SHIPPED,
];

const COMPLETED_TAB_STATUSES: readonly SalesOrderStatus[] = [
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.CLOSED,
];

function createDraftItem(): ManualOrderItemDraft {
  return {
    key: globalThis.crypto.randomUUID(),
    name: "",
    make: "",
    description: "",
    utility: "",
    quantity: "1",
    unit: "",
    unitPrice: "0",
  };
}

function createInitialManualForm(): ManualOrderFormState {
  return {
    customerName: "",
    company: "",
    email: "",
    phone: "",
    billingAddress: "",
    shippingAddress: "",
    currency: "INR",
    status: SalesOrderStatus.DRAFT,
    taxRate: "0",
    notes: "",
    items: [createDraftItem()],
  };
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function orderMatchesTab(order: SalesOrderSummary, tab: QueueTabKey) {
  switch (tab) {
    case "DRAFT":
      return DRAFT_TAB_STATUSES.includes(order.status);
    case "PROCESSING":
      return PROCESSING_TAB_STATUSES.includes(order.status);
    case "COMPLETED":
      return COMPLETED_TAB_STATUSES.includes(order.status);
    case "CANCELLED":
      return order.status === SalesOrderStatus.CANCELLED;
    default:
      return true;
  }
}

export default function SalesOrdersPage() {
  const [filter, setFilter] = useState<SalesOrderFilter>({
    search: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [activeTab, setActiveTab] = useState<QueueTabKey>("ALL");
  const [detailId, setDetailId] = useState("");
  const [isCreateDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualOrderFormState>(() => createInitialManualForm());

  const ordersQuery = useSalesOrders(filter);
  const detailQuery = useSalesOrder(detailId);
  const createMutation = useCreateSalesOrder();
  const statusMutation = useUpdateSalesOrderStatus();

  const orders = useMemo(() => ordersQuery.data?.data ?? [], [ordersQuery.data?.data]);
  const detail = detailQuery.data ?? null;

  const tabCounts = useMemo(
    () =>
      QUEUE_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        count: orders.filter((order) => orderMatchesTab(order, tab.key)).length,
      })),
    [orders]
  );

  const visibleOrders = useMemo(() => orders.filter((order) => orderMatchesTab(order, activeTab)), [activeTab, orders]);

  const manualSubtotal = manualForm.items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + quantity * unitPrice;
  }, 0);
  const manualTaxRate = Number(manualForm.taxRate) || 0;
  const manualTotal = manualSubtotal + (manualSubtotal * manualTaxRate) / 100;

  function updateManualField<K extends keyof ManualOrderFormState>(field: K, value: ManualOrderFormState[K]) {
    setManualForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateManualItem(key: string, field: keyof ManualOrderItemDraft, value: string) {
    setManualForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    }));
  }

  function addManualItem() {
    setManualForm((prev) => ({ ...prev, items: [...prev.items, createDraftItem()] }));
  }

  function removeManualItem(key: string) {
    setManualForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((item) => item.key !== key),
    }));
  }

  function resetManualForm() {
    setManualForm(createInitialManualForm());
  }

  function handleCreateOrder() {
    const customerName = manualForm.customerName.trim();
    if (!customerName) {
      toast.error("Customer name is required.");
      return;
    }

    const items = manualForm.items.map((item) => ({
      name: item.name.trim(),
      make: cleanOptional(item.make),
      description: cleanOptional(item.description),
      utility: cleanOptional(item.utility),
      quantity: Number(item.quantity),
      unit: cleanOptional(item.unit),
      unitPrice: Number(item.unitPrice),
    }));

    if (items.some((item) => !item.name)) {
      toast.error("Each line item needs a name.");
      return;
    }
    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      toast.error("Line item quantity must be greater than 0.");
      return;
    }
    if (items.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      toast.error("Line item unit price must be 0 or more.");
      return;
    }

    const payload: CreateSalesOrderInput = {
      customerName,
      company: cleanOptional(manualForm.company),
      email: cleanOptional(manualForm.email),
      phone: cleanOptional(manualForm.phone),
      billingAddress: cleanOptional(manualForm.billingAddress),
      shippingAddress: cleanOptional(manualForm.shippingAddress),
      currency: cleanOptional(manualForm.currency) || "INR",
      status: manualForm.status,
      taxRate: manualTaxRate,
      notes: cleanOptional(manualForm.notes),
      items,
    };

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        toast.success(`Order ${created.orderNumber} created.`);
        setCreateDrawerOpen(false);
        resetManualForm();
        setDetailId(created.id);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not create order.");
      },
    });
  }

  function handleStatusChange(status: SalesOrderStatus) {
    if (!detail) {
      return;
    }

    statusMutation.mutate(
      { id: detail.id, status },
      {
        onSuccess: () => {
          toast.success("Order status updated.");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Could not update status.");
        },
      }
    );
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <SalesOrdersQueueCard
        orders={visibleOrders}
        search={filter.search}
        onSearchChange={(value) => setFilter((prev) => ({ ...prev, search: value, page: 1 }))}
        tabs={tabCounts}
        activeTab={activeTab}
        onTabChange={(value) => setActiveTab(value as QueueTabKey)}
        isLoading={ordersQuery.isLoading}
        onOpenOrder={setDetailId}
        onCreateOrder={() => setCreateDrawerOpen(true)}
      />

      <CreateOrderDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        form={manualForm}
        subtotal={manualSubtotal}
        total={manualTotal}
        pending={createMutation.isPending}
        onFieldChange={updateManualField}
        onItemChange={updateManualItem}
        onAddItem={addManualItem}
        onRemoveItem={removeManualItem}
        onReset={resetManualForm}
        onSubmit={handleCreateOrder}
      />

      <OrderDetailDrawer
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId("");
          }
        }}
        order={detail}
        loading={detailQuery.isLoading}
        statusOptions={DRAWER_STATUS_OPTIONS}
        onStatusChange={handleStatusChange}
        statusPending={statusMutation.isPending}
      />
    </div>
  );
}
