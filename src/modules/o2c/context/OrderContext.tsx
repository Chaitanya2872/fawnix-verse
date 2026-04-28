import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "react-toastify";
import { toApiError } from "@/services/api";
import {
  type CreateOrderPayload,
  type DeliveryChallan,
  type InventoryCheckResult,
  type Invoice,
  type Order,
  OrderStatus,
  type Payment,
} from "../types";
import { seedOrders } from "../utils/seed";
import * as orderService from "../services/orderService";

export type OrderContextValue = {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  createNewOrder: (payload: CreateOrderPayload) => Promise<Order | null>;
  updateOrderStatus: (orderId: number, status: OrderStatus) => Promise<void>;
  getOrderById: (orderId: number) => Order | undefined;
  inventoryResults: Record<number, InventoryCheckResult>;
  setInventoryResult: (orderId: number, result: InventoryCheckResult) => void;
  deliveryChallans: Record<number, DeliveryChallan>;
  setDeliveryChallan: (orderId: number, challan: DeliveryChallan) => void;
  invoices: Record<number, Invoice>;
  setInvoice: (invoice: Invoice) => void;
  paymentsByInvoice: Record<number, Payment[]>;
  addPayment: (payment: Payment) => void;
};

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryResults, setInventoryResults] = useState<
    Record<number, InventoryCheckResult>
  >({});
  const [deliveryChallans, setDeliveryChallans] = useState<
    Record<number, DeliveryChallan>
  >({});
  const [invoices, setInvoices] = useState<Record<number, Invoice>>({});
  const [paymentsByInvoice, setPaymentsByInvoice] = useState<
    Record<number, Payment[]>
  >({});

  const refreshOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await orderService.listOrders();
      setOrders(data);
    } catch (err) {
      const apiError = toApiError(err, "Unable to load orders.");
      setError(apiError.message);
      setOrders(seedOrders);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  const createNewOrder = useCallback(async (payload: CreateOrderPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await orderService.createOrder(payload);
      setOrders((prev) => [created, ...prev]);
      toast.success("Order created successfully.");
      return created;
    } catch (err) {
      const apiError = toApiError(err, "Unable to create order.");
      setError(apiError.message);
      toast.error(apiError.message);
      const fallbackId = Math.max(0, ...orders.map((order) => order.id)) + 1;
      const created: Order = {
        id: fallbackId,
        customer_id: payload.customer.id ?? fallbackId,
        customer: payload.customer,
        status: OrderStatus.CREATED,
        items: payload.items.map((item, index) => ({
          id: index + 1,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
        total_amount: payload.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
        created_at: new Date().toISOString(),
      };
      setOrders((prev) => [created, ...prev]);
      return created;
    } finally {
      setIsLoading(false);
    }
  }, [orders]);

  const updateOrderStatus = useCallback(async (orderId: number, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    );

    try {
      await orderService.updateOrderStatus(orderId, status);
    } catch (err) {
      const apiError = toApiError(err, "Unable to update order status.");
      toast.error(apiError.message);
    }
  }, []);

  const getOrderById = useCallback(
    (orderId: number) => orders.find((order) => order.id === orderId),
    [orders]
  );

  const setInventoryResult = useCallback(
    (orderId: number, result: InventoryCheckResult) => {
      setInventoryResults((prev) => ({ ...prev, [orderId]: result }));
      void updateOrderStatus(orderId, OrderStatus.INVENTORY_CHECKED);
    },
    [updateOrderStatus]
  );

  const setDeliveryChallan = useCallback(
    (orderId: number, challan: DeliveryChallan) => {
      setDeliveryChallans((prev) => ({ ...prev, [orderId]: challan }));
      void updateOrderStatus(orderId, OrderStatus.DC_CREATED);
    },
    [updateOrderStatus]
  );

  const setInvoice = useCallback(
    (invoice: Invoice) => {
      setInvoices((prev) => ({ ...prev, [invoice.order_id]: invoice }));
      void updateOrderStatus(invoice.order_id, OrderStatus.INVOICED);
    },
    [updateOrderStatus]
  );

  const addPayment = useCallback((payment: Payment) => {
    setPaymentsByInvoice((prev) => {
      const existing = prev[payment.invoice_id] ?? [];
      return { ...prev, [payment.invoice_id]: [...existing, payment] };
    });
  }, []);

  const value = useMemo<OrderContextValue>(
    () => ({
      orders,
      isLoading,
      error,
      refreshOrders,
      createNewOrder,
      updateOrderStatus,
      getOrderById,
      inventoryResults,
      setInventoryResult,
      deliveryChallans,
      setDeliveryChallan,
      invoices,
      setInvoice,
      paymentsByInvoice,
      addPayment,
    }),
    [
      orders,
      isLoading,
      error,
      refreshOrders,
      createNewOrder,
      updateOrderStatus,
      getOrderById,
      inventoryResults,
      setInventoryResult,
      deliveryChallans,
      setDeliveryChallan,
      invoices,
      setInvoice,
      paymentsByInvoice,
      addPayment,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export { OrderContext };
