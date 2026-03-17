import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { clearAuthTokens, hasStoredSession } from "@/services/api-client";
import { hasPermission, type Permission } from "@/modules/auth/permissions";
import { useCurrentUser } from "./hooks";

type AuthStatusScreenProps = {
  title: string;
  description: string;
};

function AuthStatusScreen({ title, description }: AuthStatusScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/8 p-8 text-center shadow-2xl shadow-slate-950/30 backdrop-blur">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-200/40 border-t-blue-500" />
        <h1 className="mt-5 text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </div>
  );
}

function getRedirectPath(state: unknown) {
  const redirectState = state as
    | {
        from?: {
          pathname?: string;
          search?: string;
          hash?: string;
        };
      }
    | null;
  const from = redirectState?.from;

  if (!from?.pathname) {
    return "/crm/leads";
  }

  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}

export function PublicOnlyRoute() {
  const location = useLocation();
  const sessionPresent = hasStoredSession();
  const currentUserQuery = useCurrentUser({ enabled: sessionPresent });

  useEffect(() => {
    if (currentUserQuery.isError) {
      clearAuthTokens();
    }
  }, [currentUserQuery.isError]);

  if (sessionPresent && currentUserQuery.isPending) {
    return (
      <AuthStatusScreen
        title="Checking your session"
        description="Verifying your workspace access before we continue."
      />
    );
  }

  if (currentUserQuery.data) {
    return <Navigate to={getRedirectPath(location.state)} replace />;
  }

  return <Outlet />;
}

export function ProtectedRoute() {
  const location = useLocation();
  const sessionPresent = hasStoredSession();
  const currentUserQuery = useCurrentUser({ enabled: sessionPresent });

  useEffect(() => {
    if (currentUserQuery.isError) {
      clearAuthTokens();
    }
  }, [currentUserQuery.isError]);

  if (!sessionPresent) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (currentUserQuery.isPending) {
    return (
      <AuthStatusScreen
        title="Signing you in"
        description="Restoring your session and loading the workspace."
      />
    );
  }

  if (!currentUserQuery.data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: JSX.Element;
}) {
  const sessionPresent = hasStoredSession();
  const currentUserQuery = useCurrentUser({ enabled: sessionPresent });

  if (currentUserQuery.isPending) {
    return (
      <AuthStatusScreen
        title="Checking permissions"
        description="Verifying your access to this module."
      />
    );
  }

  if (!currentUserQuery.data || !hasPermission(currentUserQuery.data, permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
