import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { toApiError } from "@/services/api";
import { createInvoice, getInvoiceByOrderId } from "../services/invoiceService";
import { useOrders } from "./useOrders";

export function useInvoice(orderId?: number) {
  const { invoices, setInvoice } = useOrders();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoice = useMemo(() => {
    if (!orderId) return undefined;
    return invoices[orderId];
  }, [invoices, orderId]);

  const loadInvoice = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getInvoiceByOrderId(orderId);
      setInvoice(data);
    } catch (err) {
      const apiError = toApiError(err, "Unable to fetch invoice.");
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, setInvoice]);

  const generateInvoice = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await createInvoice(orderId);
      setInvoice(data);
      toast.success("Invoice generated.");
    } catch (err) {
      const apiError = toApiError(err, "Unable to generate invoice.");
      setError(apiError.message);
      toast.error(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, setInvoice]);

  return { invoice, isLoading, error, loadInvoice, generateInvoice };
}
