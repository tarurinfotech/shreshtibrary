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
            {canAttendance && <Link href="/dashboard/attendance" className={buttonClasses({ variant: "secondary", size: "md" })}>
              <QrCode className="h-4 w-4" />
              QR
            </Link>}
            {canNotifications && <Link href="/dashboard/notifications" className={buttonClasses({ variant: "primary", size: "md" })}>
              <Send className="h-4 w-4" />
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

      <div className="flex flex-wrap gap-7 [&>*]:flex-1 [&>*]:basis-[400px]">
        <ChartCard
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
          <ChartCard title="Analytics">
            <div className="grid place-items-center">
              <div className="relative h-[300px] w-full max-w-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="chartValue"
                      innerRadius={88}
                      outerRadius={120}
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
              <div className="flex flex-wrap justify-center gap-5 text-sm">
                {donutData.map((item, index) => (
                  <span key={item.name} className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: donutColors[index] }} />
                    {item.name} <span className="font-bold text-foreground">{item.value}</span>
                  </span>
                ))}
              </div>
              <div className="mt-6 w-full rounded-lg border border-border bg-panel-strong p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Girls / Boys</h3>
                  <span className="text-xs text-muted">{genderTotal} students</span>
                </div>
                <div className="grid gap-3">
                  {genderData.map((item) => {
                    const width = genderTotal ? Math.round((item.value / genderTotal) * 100) : 0;
                    return (
                      <div key={item.name} className="grid gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted">{item.name}</span>
                          <span className="font-bold text-foreground">{item.value}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted/15">
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

      <div className="flex flex-wrap gap-7 [&>*]:flex-1 [&>*]:basis-[400px]">
        <ChartCard title="Recent Activity">
          <TableShell className="!border-0 !bg-transparent !p-0 !shadow-none">
            <Table>
              <thead>
                <tr>
                  <Th>Action</Th>
                  <Th>Admin</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody>
                {(activity.data ?? []).slice(0, 6).map((item) => (
                  <tr key={item.id}>
                    <Td>
                      <div className="font-semibold">{item.action}</div>
                      <div className="text-xs text-muted">{item.description || item.target_model}</div>
                    </Td>
                    <Td>{item.admin_name}</Td>
                    <Td>{formatDateTime(item.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </ChartCard>

        <ChartCard title="Alerts">
          <div className="grid gap-4">
            {(alerts.data ?? []).map((alert) => (
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
          </div>
        </ChartCard>
      </div>
    </>
  );
}
