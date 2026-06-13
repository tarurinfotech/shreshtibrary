import type { ReactNode } from "react";
import { MetricTile } from "./MetricTile";

export function StatCard({
  label,
  value,
  icon,
  tone = "blue",
  helper,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "violet" | "rose";
  helper?: string;
}) {
  return <MetricTile label={label} value={value} helper={helper} icon={icon} tone={tone === "green" ? "emerald" : tone} />;
}
