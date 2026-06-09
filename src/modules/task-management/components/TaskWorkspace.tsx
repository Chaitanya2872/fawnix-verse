"use client";

import React, { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  CircleDashed,
  FolderKanban,
  Inbox,
  MailOpen,
  MessageSquareText,
  Search,
  UserRound,
} from "lucide-react";
import type { TaskSpaceSummary } from "../types";

export type TaskWorkspaceSection = "inbox" | "my-tasks" | "schedule" | "team-spaces";
export type TaskInboxKind = "message" | "notification";

export type TaskInboxItem = {
  id: string;
  kind: TaskInboxKind;
  title: string;
  body: string;
  timestamp: string;
  source?: string;
  unread?: boolean;
  taskId?: string;
  actionLabel?: string;
  tone?: "slate" | "sky" | "amber" | "rose" | "emerald";
};

type TaskWorkspaceSidebarProps = {
  activeSection: TaskWorkspaceSection;
  inboxUnreadCount: number;
  myTaskCount: number;
  scheduleCount: number;
  teamSpaceCount: number;
  spaces: TaskSpaceSummary[];
  selectedSpaceId: string;
  onSectionChange: (section: TaskWorkspaceSection) => void;
  onSpaceSelect: (spaceId: string) => void;
};

type TaskInboxPanelProps = {
  items: TaskInboxItem[];
  readItemIds: Set<string>;
  onReadItem: (itemId: string) => void;
  onMarkAllRead: () => void;
  onOpenTask?: (taskId: string) => void;
};

const inboxFilters = [
  { id: "all", label: "All" },
  { id: "messages", label: "Messages" },
  { id: "notifications", label: "Notifications" },
  { id: "unread", label: "Unread" },
] as const;

type InboxFilter = (typeof inboxFilters)[number]["id"];

function isUnread(item: TaskInboxItem, readItemIds: Set<string>) {
  return Boolean(item.unread) && !readItemIds.has(item.id);
}

function itemMatchesFilter(item: TaskInboxItem, filter: InboxFilter, readItemIds: Set<string>) {
  if (filter === "messages") return item.kind === "message";
  if (filter === "notifications") return item.kind === "notification";
  if (filter === "unread") return isUnread(item, readItemIds);
  return true;
}

function toneClasses(tone: TaskInboxItem["tone"], unread: boolean) {
  if (!unread) {
    return "border-slate-200 bg-white text-slate-500";
  }
  return {
    slate: "border-slate-300 bg-slate-50 text-slate-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone ?? "slate"];
}

export function TaskWorkspaceSidebar({
  activeSection,
  inboxUnreadCount,
  myTaskCount,
  scheduleCount,
  teamSpaceCount,
  spaces,
  selectedSpaceId,
  onSectionChange,
  onSpaceSelect,
}: TaskWorkspaceSidebarProps) {
  const navItems: Array<{
    id: TaskWorkspaceSection;
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    { id: "inbox", label: "Inbox", count: inboxUnreadCount, icon: <Inbox className="h-4 w-4" /> },
    { id: "my-tasks", label: "My Tasks", count: myTaskCount, icon: <UserRound className="h-4 w-4" /> },
    { id: "schedule", label: "Schedule", count: scheduleCount, icon: <CalendarDays className="h-4 w-4" /> },
    { id: "team-spaces", label: "Team Spaces", count: teamSpaceCount, icon: <FolderKanban className="h-4 w-4" /> },
  ];

  return (
    <aside className="h-full border-b border-slate-200 bg-white xl:border-b-0 xl:border-r">
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">Fawnix Tasks</p>
            <p className="truncate text-xs text-slate-500">Workspace</p>
          </div>
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-semibold text-white">
            FT
          </span>
        </div>

        <nav className="space-y-1" aria-label="Task workspace">
          {navItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={active ? "text-white" : "text-slate-400"}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-5 flex-1 border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Spaces</p>
            <button
              type="button"
              onClick={() => {
                onSectionChange("team-spaces");
                onSpaceSelect("");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              All
            </button>
          </div>
          <div className="space-y-1">
            {spaces.slice(0, 7).map((space) => {
              const active = selectedSpaceId === space.id;
              return (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => {
                    onSectionChange("team-spaces");
                    onSpaceSelect(space.id);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    active ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{space.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{space.memberCount} members</span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                </button>
              );
            })}
            {!spaces.length ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                No team spaces yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function TaskInboxPanel({
  items,
  readItemIds,
  onReadItem,
  onMarkAllRead,
  onOpenTask,
}: TaskInboxPanelProps) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [query, setQuery] = useState("");

  const unreadCount = items.filter((item) => isUnread(item, readItemIds)).length;
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!itemMatchesFilter(item, filter, readItemIds)) return false;
      if (!normalizedQuery) return true;
      return [item.title, item.body, item.source ?? "", item.timestamp].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [filter, items, query, readItemIds]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Inbox className="h-3.5 w-3.5" />
              Inbox
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Messages and notifications</h2>
            <p className="mt-1 text-sm text-slate-500">Review task activity, deadline nudges, and important workspace updates.</p>
          </div>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={!unreadCount}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            {inboxFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  filter === item.id ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="relative min-w-[240px] flex-1 xl:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search inbox"
              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300"
            />
          </label>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {visibleItems.map((item) => {
          const unread = isUnread(item, readItemIds);
          const Icon = item.kind === "message" ? MessageSquareText : Bell;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onReadItem(item.id);
                if (item.taskId) {
                  onOpenTask?.(item.taskId);
                }
              }}
              className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5 lg:flex-row lg:items-center"
            >
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${toneClasses(item.tone, unread)}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-950">{item.title}</span>
                  {unread ? <span className="h-2 w-2 rounded-full bg-sky-500" /> : null}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {item.kind}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 block text-sm leading-5 text-slate-500">{item.body}</span>
                <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{item.source ?? "Task workspace"}</span>
                  <span>-</span>
                  <span>{item.timestamp}</span>
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                {item.taskId ? item.actionLabel ?? "Open task" : unread ? "Mark read" : "Read"}
                {item.taskId ? <ChevronRight className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
              </span>
            </button>
          );
        })}

        {!visibleItems.length ? (
          <div className="flex min-h-[280px] items-center justify-center px-4 py-12">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <CircleDashed className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-950">Inbox is clear</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">New messages and task notifications will appear here.</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
