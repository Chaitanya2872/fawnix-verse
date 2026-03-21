import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Search,
  Settings,
  UserCircle2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCurrentUser, useLogout } from "@/modules/auth/hooks";
import { connectLeadNotificationsStream } from "@/modules/crm/leads/api";
import { leadsKeys, useLeadNotifications } from "@/modules/crm/leads/hooks";
import { hasStoredSession } from "@/services/api-client";

type TopbarProps = {
  title?: string;
  breadcrumb?: string;
  showSearch?: boolean;
  userName?: string;
  userEmail?: string;
  className?: string;
};

function getUserInitials(userName: string): string {
  return userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({
  title = "Dashboard",
  breadcrumb = "ERP / Dashboard",
  showSearch = true,
  userName,
  userEmail,
  className,
}: TopbarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() });
  const logoutMutation = useLogout();
  const notificationsQuery = useLeadNotifications({
    enabled: hasStoredSession(),
    refetchInterval: 15_000,
  });

  const resolvedUserName = userName ?? currentUser?.name ?? "Admin User";
  const resolvedUserEmail = userEmail ?? currentUser?.email ?? "admin@fawnix.com";
  const userInitials = getUserInitials(resolvedUserName) || "AU";

  const [lastSeenNewLeads, setLastSeenNewLeads] = useState<number | null>(null);
  const notifications = notificationsQuery.data;

  useEffect(() => {
    if (!notifications) {
      return;
    }
    if (lastSeenNewLeads === null) {
      setLastSeenNewLeads(notifications.newLeadCount);
    }
  }, [notifications, lastSeenNewLeads]);

  useEffect(() => {
    if (!hasStoredSession()) {
      return;
    }
    const cleanup = connectLeadNotificationsStream(
      () => {
        queryClient.invalidateQueries({ queryKey: leadsKeys.notifications() });
        queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
      },
      () => {
        // fall back to polling only
      }
    );
    return () => {
      cleanup?.();
    };
  }, [queryClient]);

  const unreadNewLeads = useMemo(() => {
    if (!notifications || lastSeenNewLeads === null) {
      return 0;
    }
    return Math.max(0, notifications.newLeadCount - lastSeenNewLeads);
  }, [notifications, lastSeenNewLeads]);

  const followUpDueCount = notifications?.followUpDueCount ?? 0;
  const badgeCount = unreadNewLeads + followUpDueCount;
  const badgeLabel = badgeCount > 99 ? "99+" : badgeCount.toString();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 border-b border-blue-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90",
        className
      )}
    >
      <div className="flex h-full items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-500">{breadcrumb}</p>
          <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            {title}
          </h1>
        </div>

        {showSearch ? (
          <div className="hidden w-full max-w-md flex-1 lg:block">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-blue-500"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search modules, records, invoices..."
                className="h-9 border-blue-100 bg-slate-50/70 pl-9 text-slate-700 placeholder:text-slate-400 focus-visible:ring-blue-500"
              />
            </div>
          </div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <DropdownMenu
            onOpenChange={(open) => {
              if (open && notifications) {
                setLastSeenNewLeads(notifications.newLeadCount);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {badgeCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {badgeLabel}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 border-blue-100 bg-white p-0">
              <div className="border-b border-blue-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <p className="text-xs text-slate-500">
                  {notifications?.updatedAt
                    ? `Updated ${new Date(notifications.updatedAt).toLocaleTimeString()}`
                    : "Checking for updates..."}
                </p>
              </div>
              <div className="space-y-3 px-4 py-3 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      New leads
                    </p>
                    <p className="text-sm font-semibold text-emerald-900">
                      {notifications?.newLeadCount ?? 0} total
                    </p>
                    {unreadNewLeads > 0 ? (
                      <p className="text-xs text-emerald-700">
                        {unreadNewLeads} new since last check
                      </p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => navigate("/crm/leads")}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    View
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Follow-ups due
                    </p>
                    <p className="text-sm font-semibold text-amber-900">
                      {followUpDueCount} pending
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/crm/leads")}
                    className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    Open
                  </button>
                </div>

                {notificationsQuery.isError ? (
                  <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    Unable to load notifications.
                  </div>
                ) : null}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Toggle theme"
          >
            <Moon className="h-4 w-4" aria-hidden="true" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-full px-2 pr-3 text-slate-700 hover:bg-blue-50"
                aria-label="Open user menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {userInitials}
                </span>
                <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                  {resolvedUserName}
                </span>
                <ChevronDown
                  className="hidden h-4 w-4 text-slate-400 sm:block"
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 border-blue-100 bg-white">
              <DropdownMenuLabel className="space-y-1">
                <p className="text-sm leading-none font-medium">{resolvedUserName}</p>
                <p className="text-xs font-normal text-slate-500">{resolvedUserEmail}</p>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="gap-2 text-slate-700 focus:bg-blue-50 focus:text-blue-700">
                <UserCircle2 className="h-4 w-4" aria-hidden="true" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-slate-700 focus:bg-blue-50 focus:text-blue-700">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                disabled={logoutMutation.isPending}
                onClick={() => {
                  void handleLogout();
                }}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
