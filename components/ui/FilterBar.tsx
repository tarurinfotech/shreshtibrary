import React, { ReactNode } from "react";

function FilterBarRoot({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mb-5 flex flex-col items-stretch gap-3 rounded-2xl border border-border bg-panel p-4 sm:flex-row sm:flex-wrap sm:items-end ${className}`}
    >
      {children}
    </div>
  );
}

export const FilterBar = {
  Root: FilterBarRoot,
};
