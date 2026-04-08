import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type P2PColumn = {
  key: string;
  label: string;
  className?: string;
};

type P2PRow = {
  id: string;
  [key: string]: ReactNode;
};

type P2PTableProps = {
  columns: P2PColumn[];
  rows: P2PRow[];
  className?: string;
};

export function P2PTable({ columns, rows, className }: P2PTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-slate-200", className)}>
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide",
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-slate-50/80">
              {columns.map((column) => (
                <td
                  key={`${row.id}-${column.key}`}
                  className={cn("border-b border-slate-100 px-4 py-3 text-slate-700", column.className)}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
