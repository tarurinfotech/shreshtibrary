import clsx from "clsx";

export function TableShell({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={clsx("surface w-full min-w-0 overflow-hidden rounded-lg p-3", className)}>
      <div className={clsx("overflow-x-auto", innerClassName)}>{children}</div>
    </div>
  );
}

export function Table({
  children,
  className,
  minWidth = 760,
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
}) {
  return (
    <table
      className={clsx("w-full border-separate border-spacing-y-1 text-left text-sm", className)}
      style={{ minWidth }}
    >
      {children}
    </table>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={clsx("px-4 py-3 text-xs font-semibold tracking-normal text-muted", className)}>
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={clsx("bg-panel-strong px-4 py-3 align-middle text-foreground first:rounded-l-lg last:rounded-r-lg", className)}>{children}</td>;
}
