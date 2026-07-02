"use client";

import type { ReactNode } from "react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SectionCard } from "@/components/ui/SectionCard";
import { ChartEmpty, ChartTooltip, ProgressBar, ProgressRing } from "@/components/ui/ChartWidgets";

export const reportPalette = ["#5b83f7", "#ffcf62", "#ff7e63", "#8f75ff", "#20b486", "#f472b6"];

export function ReportCard({
  title,
  eyebrow,
  children,
  className,
  delay = 0,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <SectionCard animated delay={delay} title={title} eyebrow={eyebrow} className={className} padding="md" menu>
      {children}
    </SectionCard>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  helper,
  tone,
  ring,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: string;
  ring?: number;
  delay: number;
}) {
  return (
    <ReportCard title={label} eyebrow="Performance" delay={delay}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className={`mb-3 grid h-9 w-9 place-items-center rounded-full ${tone}`}>{icon}</span>
          <p className="text-xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted">{helper}</p>
        </div>
        {ring !== undefined && <ProgressRing value={ring} />}
      </div>
    </ReportCard>
  );
}

export function MiniAreaChart({ data, dataKey }: { data: Array<Record<string, string | number>>; dataKey: string }) {
  if (!data.length) {
    return <ChartEmpty label="No trend data" compact />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="miniAreaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--accent-sky)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--accent-sky)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Tooltip content={<ChartTooltip money />} />
        <Area type="monotone" dataKey={dataKey} stroke="var(--accent-sky)" strokeWidth={2.5} fill="url(#miniAreaFill)" dot={{ r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!data.length || total === 0) {
    return <ChartEmpty label="No chart data" compact />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <PieChart>
        <Tooltip content={<ChartTooltip />} />
        <Pie data={data} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="84%" paddingAngle={5} stroke="var(--panel)" strokeWidth={3}>
          {data.map((_, index) => <Cell key={index} fill={reportPalette[index % reportPalette.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LegendList({ data }: { data: Array<{ label: string; value: number }> }) {
  return (
    <div className="grid content-center gap-1.5">
      {data.map((item, index) => (
        <div key={item.label} className="flex items-center justify-between gap-2 rounded-lg bg-panel-strong px-2.5 py-1.5 text-xs">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: reportPalette[index % reportPalette.length] }} />
            <span className="truncate">{item.label}</span>
          </span>
          <span className="font-semibold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function OverviewRow({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong p-2.5">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-full ${tone}`}>{icon}</span>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function TinyProgress({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return <ProgressBar label={label} value={value} total={total} color={color} />;
}

export function ListItem({
  icon,
  title,
  meta,
  value,
  tone,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-panel-strong p-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: tone }}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{title}</p>
          <p className="truncate text-[11px] text-muted">{meta}</p>
        </div>
      </div>
      <span className="shrink-0 text-xs font-semibold">{value}</span>
    </div>
  );
}

export function TableSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <SectionCard animated title={title} padding="md" className="report-card" actions={<span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span>}>
      {children}
    </SectionCard>
  );
}

export { ChartEmpty, ChartTooltip, ProgressRing, ProgressBar };
