import { useCallback, useEffect, useState } from "react";
import flowService from "../services/flowService";
import visitorRequestService from "../services/visitorRequestService";
import type { VisitorAction, VisitorRecord } from "../types";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useVisitors(filter = "") {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const data = await visitorRequestService.getAll(filter);
    setVisitors(data as VisitorRecord[]);
    return data as VisitorRecord[];
  }, [filter]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await visitorRequestService.getAll(filter);
        if (!cancelled) setVisitors(data as VisitorRecord[]);
      } catch (error) {
        if (!cancelled) setError(getErrorMessage(error, "Could not load visitors."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return { visitors, setVisitors, loading, error, refresh };
}

export function useVisitor(id?: string | number) {
  const [visitor, setVisitor] = useState<VisitorRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return null;
    setError(null);
    const data = (await visitorRequestService.getById(id)) as VisitorRecord;
    setVisitor(data);
    flowService.setCurrentVisitor(data);
    return data;
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setVisitor(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = (await visitorRequestService.getById(id)) as VisitorRecord;
        if (!cancelled) {
          setVisitor(data);
          flowService.setCurrentVisitor(data);
        }
      } catch (error) {
        if (!cancelled) setError(getErrorMessage(error, "Could not load visitor details."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { visitor, setVisitor, loading, error, refresh };
}

export function useVisitorActions(onComplete?: (visitor?: VisitorRecord | null) => Promise<void> | void) {
  const [busyAction, setBusyAction] = useState<VisitorAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = useCallback(
    async (action: VisitorAction, visitor: VisitorRecord, rejectionReason = "") => {
      setBusyAction(action);
      setError(null);
      try {
        let updated: VisitorRecord | null | undefined;

        if (action === "approve") {
          updated = (await visitorRequestService.approve(visitor.id)) as VisitorRecord;
        }
        if (action === "reject") {
          updated = (await visitorRequestService.reject(visitor.id, rejectionReason)) as VisitorRecord;
        }
        if (action === "delete") {
          await visitorRequestService.delete(visitor.id);
          updated = null;
        }
        if (action === "checkIn") {
          updated = (await visitorRequestService.checkIn(visitor.id, visitor.qrCodeData)) as VisitorRecord;
        }
        if (action === "checkOut") {
          updated = (await visitorRequestService.checkOut(visitor.id, visitor.qrCodeData)) as VisitorRecord;
        }

        if (updated) {
          flowService.setCurrentVisitor(updated);
        } else if (action === "delete") {
          flowService.clearCurrentVisitor();
        }

        await onComplete?.(updated);
        return updated ?? null;
      } catch (error) {
        const message = getErrorMessage(error, "Visitor action failed.");
        setError(message);
        throw new Error(message);
      } finally {
        setBusyAction(null);
      }
    },
    [onComplete],
  );

  return { runAction, busyAction, error, setError };
}
