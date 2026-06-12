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
}) {
  if (loading) {
    return <LoadingBlock label="Loading" />;
  }

  if (error) {
    return <ErrorState message={typeof error === "string" ? error : "Unable to load records."} />;
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
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
            <tr key={getRowKey(row)} className={typeof rowClassName === "function" ? rowClassName(row) : rowClassName}>
              {columns.map((column) => (
                <Td key={column.id} className={column.className}>{column.cell(row)}</Td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </TableShell>
  );
}
