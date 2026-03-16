import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Search,
  Settings,
  UserCircle2,
} from "lucide-react";
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
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() });
  const logoutMutation = useLogout();

  const resolvedUserName = userName ?? currentUser?.name ?? "Admin User";
  const resolvedUserEmail = userEmail ?? currentUser?.email ?? "admin@fawnix.com";
  const userInitials = getUserInitials(resolvedUserName) || "AU";

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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </Button>

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
