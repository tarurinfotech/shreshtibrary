"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Armchair,
  Bell,
  CalendarCheck,
  CreditCard,
  QrCode,
  Send,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

const chartDomains = ["attendance", "revenue", "students", "memberships", "seats", "study"];
const donutColors = ["#5b8cff", "#ffd166", "#ff7f63"];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isSuper = user?.role === "super_admin";
  const hasPerm = (key: string) => isSuper || Boolean(user?.permissions?.[key]);

  const canAttendance = hasPerm("manage_attendance");
  const canPayments = hasPerm("manage_payments");
  const canStudents = hasPerm("manage_students");
  const canPlans = hasPerm("manage_plans");
  const canSeats = hasPerm("manage_seats");
  const canNotifications = hasPerm("manage_notifications");

  const allowedDomains = chartDomains.filter(domain => {
    if (domain === "attendance") return canAttendance;
    if (domain === "revenue") return canPayments;
    if (domain === "students") return canStudents;
    if (domain === "memberships") return canPlans;
    if (domain === "seats") return canSeats;
    return true;
  });

  const defaultDomain = allowedDomains.length > 0 ? allowedDomains[0] : "study";
  const [chartDomain, setChartDomain] = useState(defaultDomain);

  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: endpoints.dashboardStats });
  const chart = useQuery({
    queryKey: ["dashboard-chart", chartDomain],
    queryFn: () => endpoints.dashboardChart(chartDomain),
  });
  const alerts = useQuery({ queryKey: ["dashboard-alerts"], queryFn: endpoints.dashboardAlerts });
  const activity = useQuery({
    queryKey: ["dashboard-activity-recent"],
    queryFn: endpoints.dashboardActivityRecent,
  });

  const chartRows =
    chart.data?.labels?.map((label, index) => ({
      label,
      value: chart.data?.present?.[index] ?? chart.data?.revenue?.[index] ?? 0,
    })) ?? [];

  const totalStudents = stats.data?.students?.total ?? stats.data?.total_registered_students ?? 0;
  const donutData = useMemo(
    () =>
      [
        { name: "Live", value: stats.data?.students?.live ?? 0, chartValue: Math.max(stats.data?.students?.live ?? 0, 0) },
        { name: "Expired", value: stats.data?.students?.expired ?? 0, chartValue: Math.max(stats.data?.students?.expired ?? 0, 0) },
        { name: "Suspended", value: stats.data?.students?.suspended ?? 0, chartValue: Math.max(stats.data?.students?.suspended ?? 0, 0) },
      ].map((item) => ({
        ...item,
        chartValue: totalStudents > 0 ? item.chartValue : item.name === "Live" ? 1 : 0,
      })),
    [
      stats.data?.students?.expired,
      stats.data?.students?.live,
      stats.data?.students?.suspended,
      totalStudents,
    ],
  );
  const genderData = useMemo(
    () => [
      { name: "Girls", value: stats.data?.students?.girls ?? 0, color: "#f472b6" },
      { name: "Boys", value: stats.data?.students?.boys ?? 0, color: "#38bdf8" },
      { name: "Other", value: stats.data?.students?.other ?? 0, color: "#a78bfa" },
    ].filter((item) => item.value > 0),
    [stats.data?.students?.boys, stats.data?.students?.girls, stats.data?.students?.other],
  );
  const genderTotal = genderData.reduce((sum, item) => sum + item.value, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        eyebrow="Overview"
        actions={
          <>
            {canAttendance && <Link href="/dashboard/attendance" className={buttonClasses({ variant: "secondary", size: "md" })} aria-label="Scan QR Code for Attendance">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              QR
            </Link>}
            {canNotifications && <Link href="/dashboard/notifications" className={buttonClasses({ variant: "primary", size: "md" })} aria-label="Send Notifications">
              <Send className="h-4 w-4" aria-hidden="true" />
              Notify
            </Link>}
          </>
        }
      />

      {stats.isLoading ? <LoadingBlock label="Loading stats" /> : null}
      {stats.error ? <ErrorState message="Unable to load dashboard stats." /> : null}

      {stats.data ? (
        <div className="flex flex-wrap gap-4 [&>*]:flex-1 [&>*]:basis-[240px]">
          {canStudents && (
            <>
              <StatCard
                label="Students"
                value={stats.data.students?.total ?? stats.data.total_registered_students ?? 0}
                icon={<Users className="h-9 w-9" strokeWidth={1.8} />}
                tone="violet"
                helper="Registered profiles"
              />
              <StatCard
                label="Live Members"
                value={stats.data.students?.live ?? stats.data.active_memberships ?? 0}
                icon={<CalendarCheck className="h-9 w-9" strokeWidth={1.8} />}
                tone="blue"
                helper="Currently active"
              />
            </>
          )}
          {canPayments && <StatCard
            label="Revenue"
            value={formatMoney(stats.data.payments?.month_amount ?? 0)}
            icon={<CreditCard className="h-9 w-9" strokeWidth={1.8} />}
            tone="amber"
            helper={`${stats.data.payments?.month_count ?? 0} payments`}
          />}
          {canSeats && <StatCard
            label="Seats"
            value={stats.data.seats?.available ?? stats.data.available_seats ?? 0}
            icon={<Armchair className="h-9 w-9" strokeWidth={1.8} />}
            tone="green"
            helper={`${stats.data.seats?.occupied ?? 0} occupied`}
          />}
        </div>
      ) : null}

      <div className="grid gap-7 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Reports"
          actions={
            <div className="hidden flex-wrap gap-2 lg:flex">
              {allowedDomains.slice(0, 4).map((domain) => (
                <Button
                  key={domain}
                  size="sm"
                  variant={chartDomain === domain ? "primary" : "ghost"}
                  onClick={() => setChartDomain(domain)}
                >
                  {domain}
                </Button>
              ))}
            </div>
          }
        >
          {chart.isLoading ? <LoadingBlock label="Loading chart" /> : null}
          {chart.error ? <ErrorState message="Unable to load chart." /> : null}
          {chartRows.length > 0 ? (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows} margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportLine" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#52b8ff" />
                      <stop offset="52%" stopColor="#8f75ff" />
                      <stop offset="100%" stopColor="#f45cff" />
                    </linearGradient>
                    <linearGradient id="reportFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#8f75ff" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#8f75ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.55} vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4", fill: "transparent" }}
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      boxShadow: "var(--shadow-soft)",
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="url(#reportLine)" strokeWidth={4} fill="url(#reportFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {(chart.data?.items ?? []).map((item, index) => (
                <div key={index} className="rounded-lg border border-border bg-panel-strong p-3 text-sm">
                  {Object.entries(item).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3 border-b border-border py-1 last:border-0">
                      <span className="text-muted">{key}</span>
                      <span className="font-medium">{String(value ?? "0")}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {canStudents && (
          <ChartCard title="Analytics" className="lg:col-span-1">
            <div className="grid place-items-center">
              <div className="relative h-[220px] w-full max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="chartValue"
                      innerRadius={72}
                      outerRadius={96}
                      paddingAngle={8}
                      cornerRadius={18}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={entry.name} fill={donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-3xl font-black">{totalStudents}</p>
                    <p className="mt-2 text-sm text-muted">Total students</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-5 text-sm" role="list" aria-label="Student status breakdown">
                {donutData.map((item, index) => (
                  <span key={item.name} className="inline-flex items-center gap-2" role="listitem">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: donutColors[index] }} aria-hidden="true" />
                    {item.name} <span className="font-bold text-foreground">{item.value}</span>
                  </span>
                ))}
              </div>
              <div className="mt-4 w-full rounded-lg border border-border bg-panel-strong p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Girls / Boys</h3>
                  <span className="text-xs text-muted">{genderTotal} students</span>
                </div>
                <div className="grid gap-2">
                  {genderData.map((item) => {
                    const width = genderTotal ? Math.round((item.value / genderTotal) * 100) : 0;
                    return (
                      <div key={item.name} className="grid gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted">{item.name}</span>
                          <span className="font-bold text-foreground">{item.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted/15">
                          <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    );
                  })}
                  {genderData.length === 0 ? <p className="text-sm text-muted">No gender data available.</p> : null}
                </div>
              </div>
            </div>
          </ChartCard>
        )}
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        <ChartCard title="Recent Activity">
          {activity.isLoading ? <LoadingBlock label="Loading activity" /> : null}
          {activity.error ? <ErrorState message="Unable to load activity." /> : null}
          {activity.data && (
          <div className="flex flex-col px-2 py-1">
            {activity.data.slice(0, 6).map((item, index, arr) => (
              <div key={item.id} className="relative flex gap-5 pb-6 last:pb-0">
                {/* Timeline line */}
                {index !== arr.length - 1 && (
                  <div className="absolute bottom-0 left-[11px] top-7 w-[2px] bg-border" />
                )}
                {/* Timeline dot */}
                <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[3px] border-panel bg-[color:var(--primary-soft)]">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                {/* Content */}
                <div className="flex flex-col pt-0.5">
                  <p className="text-sm font-semibold text-foreground">{item.action}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {item.description || item.target_model}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                    <span className="font-medium text-foreground">{item.admin_name}</span>
                    <span>&bull;</span>
                    <span>{formatDateTime(item.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
            {activity.data.length === 0 && (
              <div className="py-4 text-sm text-muted">No recent activity found.</div>
            )}
          </div>
          )}
        </ChartCard>

        <ChartCard title="Alerts">
          {alerts.isLoading ? <LoadingBlock label="Loading alerts" /> : null}
          {alerts.error ? <ErrorState message="Unable to load alerts." /> : null}
          {alerts.data && (
          <div className="grid gap-4">
            {alerts.data.map((alert) => (
              <div key={alert.type} className="flex items-center justify-between rounded-lg border border-border bg-panel-strong p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--primary-soft)] text-primary">
                    <Bell className="h-5 w-5" />
                  </span>
                  <span className="font-medium">{alert.label}</span>
                </div>
                <Badge variant={alert.count > 0 ? "warning" : "success"}>{alert.count}</Badge>
              </div>
            ))}
            {alerts.data.length === 0 && (
              <div className="py-4 text-sm text-muted">No new alerts.</div>
            )}
          </div>
          )}
        </ChartCard>
      </div>
    </>
  );
}
