import { BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/format";

export function ChartPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong p-4">
      <div className="mb-4 flex items-center gap-2">
        {icon ? <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span> : null}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

export function ChartEmpty({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-lg border border-dashed border-border bg-panel-strong text-xs text-muted ${compact ? "h-full" : "h-32"}`}>
      <div className="grid justify-items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs shadow-[var(--shadow-soft)]">
      {label ? <p className="mb-1 font-semibold">{label}</p> : null}
      <div className="grid gap-1">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold">{money ? formatMoney(Number(item.value ?? 0)) : item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressRing({ value, color = "var(--primary)" }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(value, 100));

  return (
    <div
      className="grid h-[76px] w-[76px] place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, color-mix(in srgb, var(--border) 70%, transparent) 0deg)` }}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-panel text-xs font-bold">{pct}%</div>
    </div>
  );
}

export function ProgressBar({
  label,
  value,
  total,
  color = "var(--primary)",
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
}) {
  const pct = total ? Math.min(Math.round((value / total) * 100), 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-panel-strong">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export interface SharedAreaChartProps {
  data: any[];
  xKey: string;
  yKeys: Array<{ key: string; name: string; color: string; fillOpacity?: number }>;
  height?: number;
}

export function SharedAreaChart({ data, xKey, yKeys, height = 300 }: SharedAreaChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={data} margin={{ left: -20, right: 10 }}>
          <defs>
            {yKeys.map((y, idx) => (
              <linearGradient key={`grad-${y.key}-${idx}`} id={`grad-${y.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={y.color} stopOpacity={y.fillOpacity ?? 0.35} />
                <stop offset="95%" stopColor={y.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4", fill: "transparent" }}
            contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8 }}
          />
          {yKeys.map((y, idx) => (
            <Area
              key={`area-${y.key}-${idx}`}
              type="monotone"
              dataKey={y.key}
              name={y.name}
              stroke={y.color}
              strokeWidth={y.fillOpacity === 0 ? 2 : 3}
              fill={y.fillOpacity === 0 ? "transparent" : `url(#grad-${y.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
