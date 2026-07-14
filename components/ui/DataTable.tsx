import type { ReactNode } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "./StateBlocks";
import { Table, TableShell, Td, Th } from "./Table";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type PaginationOptions = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  loading,
  error,
  emptyTitle = "No records found",
  emptyMessage,
  minWidth = 760,
  shellClassName,
  tableClassName,
  rowClassName,
  onRowClick,
  pagination,
}: {
  data: T[];
  columns: Array<DataTableColumn<T>>;
  getRowKey: (row: T) => string | number;
  loading?: boolean;
  error?: boolean | string;
  emptyTitle?: string;
  emptyMessage?: string;
  minWidth?: number;
  shellClassName?: string;
  tableClassName?: string;
  rowClassName?: string | ((row: T) => string | undefined);
  onRowClick?: (row: T) => void;
  pagination?: PaginationOptions;
}) {
  if (loading) {
    return <LoadingBlock label="Loading" />;
  }

  if (error) {
    return <ErrorState message={typeof error === "string" ? error : "Unable to load records."} />;
  }

  if (!data || !data.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <TableShell className={shellClassName}>
        <Table className={tableClassName} minWidth={minWidth}>
          <thead>
            <tr>
              {columns.map((column) => (
                <Th key={column.id} className={column.headerClassName}>{column.header}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr 
                key={getRowKey(row)} 
                className={`${typeof rowClassName === "function" ? rowClassName(row) : rowClassName} ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <Td key={column.id} className={column.className}>{column.cell(row)}</Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableShell>

      {pagination && (
        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-muted">
            Page <span className="font-medium text-foreground">{pagination.currentPage}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.totalPages}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:bg-hover disabled:pointer-events-none disabled:opacity-50"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let startPage = Math.max(1, pagination.currentPage - 2);
                if (startPage + 4 > pagination.totalPages) {
                  startPage = Math.max(1, pagination.totalPages - 4);
                }
                const pageNum = startPage + i;
                if (pageNum > pagination.totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => pagination.onPageChange(pageNum)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                      pagination.currentPage === pageNum
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-hover'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:bg-hover disabled:pointer-events-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
