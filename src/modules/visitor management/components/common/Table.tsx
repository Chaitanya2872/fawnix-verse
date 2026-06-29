import { isValidElement, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Icons } from "./Icons";

type TableRow = Record<string, unknown>;

type TableColumn = {
  id?: string;
  header: ReactNode;
  accessor?: string | ((row: TableRow) => unknown);
  sortable?: boolean;
  searchable?: boolean;
  render?: (row: TableRow, value: unknown) => ReactNode;
};

type TableProps = {
  columns: TableColumn[];
  data: TableRow[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbar?: ReactNode;
};

type SortState = {
  key: string | null;
  direction: "asc" | "desc";
};

const getColumnKey = (column: TableColumn, index = 0) => {
  if (column.id) return column.id;
  if (typeof column.accessor === "string") return column.accessor;
  if (typeof column.header === "string" || typeof column.header === "number") return String(column.header);
  return `column-${index}`;
};

const getRowKey = (row: TableRow, rowIndex: number) => {
  const id = row.id;
  const visitorId = row.visitorId;

  if (typeof id === "string" || typeof id === "number") return id;
  if (typeof visitorId === "string" || typeof visitorId === "number") return visitorId;
  return rowIndex;
};

const getValue = (row: TableRow, accessor?: TableColumn["accessor"]) => {
  if (typeof accessor === "function") return accessor(row);
  if (!accessor) return undefined;
  return row?.[accessor];
};

const toSearchText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
};

const toCellContent = (value: unknown): ReactNode => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (isValidElement(value)) return value;
  return "";
};

const Table = ({
  columns,
  data,
  searchable = false,
  searchPlaceholder = "Search records",
  emptyMessage = "No data available",
  toolbar,
}: TableProps) => {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });

  const filteredData = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const searchableColumns = columns.filter((column) => column.searchable !== false);

    const next = normalizedQuery
      ? data.filter((row) =>
          searchableColumns.some((column) =>
            toSearchText(getValue(row, column.accessor)).toLowerCase().includes(normalizedQuery),
          ),
        )
      : data;

    if (!sort.key) return next;

    const activeColumn = columns.find((column, index) => getColumnKey(column, index) === sort.key);
    if (!activeColumn) return next;

    return [...next].sort((a, b) => {
      const aValue = toSearchText(getValue(a, activeColumn.accessor)).toLowerCase();
      const bValue = toSearchText(getValue(b, activeColumn.accessor)).toLowerCase();
      return sort.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [columns, data, query, sort]);

  const handleSort = (column: TableColumn, index: number) => {
    if (column.sortable === false) return;

    const key = getColumnKey(column, index);
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  };

  return (
    <div className="data-card">
      {(searchable || toolbar) && (
        <div className="data-toolbar">
          {searchable && (
            <label className="search-field">
              <Icons.Search />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </label>
          )}
          {toolbar && <div className="data-toolbar-actions">{toolbar}</div>}
        </div>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column, index) => {
                const key = getColumnKey(column, index);
                const sortable = column.sortable !== false;
                const isActive = sort.key === key;

                return (
                  <th key={key}>
                    <button
                      type="button"
                      className={`table-sort ${sortable ? "" : "is-static"}`}
                      onClick={() => handleSort(column, index)}
                      disabled={!sortable}
                    >
                      {column.header}
                      {sortable && (
                        <span className="sort-indicator">
                          {isActive ? (sort.direction === "asc" ? "A-Z" : "Z-A") : ""}
                        </span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, rowIndex) => (
                <tr key={getRowKey(row, rowIndex)}>
                  {columns.map((column, index) => {
                    const key = getColumnKey(column, index);
                    const value = getValue(row, column.accessor);
                    return <td key={key}>{column.render ? column.render(row, value) : toCellContent(value)}</td>;
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-cell" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
