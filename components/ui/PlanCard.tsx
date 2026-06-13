import React, { ReactNode } from "react";
import { Badge, statusVariant } from "@/components/ui/Badge";

export function PlanCard({
  title,
  duration,
  isActive,
  price,
  description,
  stats,
  actions,
}: {
  title: string;
  duration: string;
  isActive: boolean;
  price: string | ReactNode;
  description: ReactNode;
  stats?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="surface grid gap-4 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{duration}</p>
        </div>
        <Badge variant={statusVariant(isActive ? "active" : "inactive")}>{isActive ? "Active" : "Inactive"}</Badge>
      </div>
      <p className="text-3xl font-semibold tracking-normal">{price}</p>
      <p className="min-h-12 text-sm text-muted">{description}</p>
      {stats && <div className="flex flex-wrap gap-2 text-xs text-muted">{stats}</div>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
