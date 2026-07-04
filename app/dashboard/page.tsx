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
  User,
  LogIn,
  Settings,
  Clock,
  Clock8,
  Shield,
  Activity
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
import { SectionCard } from "@/components/ui/SectionCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricTile } from "@/components/ui/MetricTile";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

const chartDomains = ["attendance", "revenue", "students", "memberships", "seats", "study"];
const donutColors = ["#22c55e", "#f59e0b", "#dc2626", "#f97316"];
function ActivityRow({ item, isLast }: { item: any; isLast: boolean }) {
  let parsed: any = null;
  let isJson = false;
  if (item.description) {
    try {
      parsed = JSON.parse(item.description);
      isJson = true;
    } catch {
      parsed = item.description;
    }
  }

  let Icon = Activity;
  let colorClass = "bg-primary/10 text-primary border-primary/20";
  let title = item.action.replace(/_/g, " ").replace(/\w\S*/g, (t: string) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
  let content: React.ReactNode = null;

  if (item.action === "ATTENDANCE_UPDATE" && isJson) {
    Icon = CalendarCheck;
    colorClass = "bg-amber-500/15 text-amber-600 border-amber-500/20";
    title = `Attendance: ${parsed.NewStatus || parsed.status || "Updated"}`;
    
    content = (
      <div className="mt-1 text-sm text-muted">
        <p>Student <span className="font-medium text-foreground">#{parsed.Student || parsed.student_id}</span> was marked <span className="font-medium text-foreground">{parsed.NewStatus || parsed.status}</span>.</p>
      </div>
    );
  } else if (item.action === "ATTENDANCE_AUTO_CHECKOUT" && isJson) {
    Icon = Clock8;
    colorClass = "bg-purple-500/15 text-purple-600 border-purple-500/20";
    title = "Automatic Checkout";
    
    content = (
      <div className="mt-1 text-sm text-muted">
        <p>Student <span className="font-medium text-foreground">#{parsed.Student}</span> was automatically checked out after <span className="font-medium text-foreground">{parsed.TotalHours}</span> of study.</p>
      </div>
    );
  } else if (item.action === "STUDY_SESSION_AUTO_CLOSED" && isJson) {
    Icon = Clock;
    colorClass = "bg-indigo-500/15 text-indigo-600 border-indigo-500/20";
    title = "Session Ended";
    
    content = (
      <div className="mt-1 text-sm text-muted">
        <p>A study session was automatically closed after <span className="font-medium text-foreground">{parsed.Duration}</span>.</p>
      </div>
    );
  } else if (item.action.toLowerCase().includes("login")) {
    Icon = LogIn;
    colorClass = "bg-sky-500/15 text-sky-600 border-sky-500/20";
    title = "User Logged In";
  } else if (item.action.toLowerCase().includes("payment")) {
    Icon = CreditCard;
    colorClass = "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
    title = "Payment Processed";
    if (isJson && (parsed.amount || parsed.Amount)) {
      content = <p className="mt-1 text-sm text-muted">A payment of <span className="font-medium text-foreground">₹{parsed.amount || parsed.Amount}</span> was recorded.</p>;
    }
  } else if (item.action.toLowerCase().includes("student")) {
    Icon = User;
    colorClass = "bg-rose-500/15 text-rose-600 border-rose-500/20";
    if (isJson && (parsed.student_id || parsed.id || parsed.Student)) {
      content = <p className="mt-1 text-sm text-muted">Updated details for student <span className="font-medium text-foreground">#{parsed.student_id || parsed.id || parsed.Student}</span>.</p>;
    }
  } else {
    Icon = Settings;
    colorClass = "bg-slate-500/15 text-slate-600 border-slate-500/20";
    content = <p className="mt-1 text-sm text-muted">System configuration or record was updated.</p>;
  }

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && (
        <div className="absolute bottom-0 left-[15px] top-8 w-[2px] bg-border/40" />
      )}
      <div className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pt-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <span className="shrink-0 rounded-full bg-panel px-2 py-0.5 text-[10px] font-medium text-muted border border-border">
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {content}
        
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          <Shield className="h-3 w-3" />
          <span className="font-medium text-foreground">{item.admin_name}</span>
          <span className="text-border">•</span>
          <span>{new Date(item.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

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
  const attendanceSummary = useQuery({ queryKey: ["dashboard-attendance-summary"], queryFn: () => endpoints.attendanceDailySummary() });
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
        { name: "Pending", value: stats.data?.students?.pending ?? 0, chartValue: Math.max(stats.data?.students?.pending ?? 0, 0) },
        { name: "Expired", value: stats.data?.students?.expired ?? 0, chartValue: Math.max(stats.data?.students?.expired ?? 0, 0) },
        { name: "Suspended", value: stats.data?.students?.suspended ?? 0, chartValue: Math.max(stats.data?.students?.suspended ?? 0, 0) },
      ].map((item) => ({
        ...item,
        chartValue: totalStudents > 0 ? item.chartValue : item.name === "Live" ? 1 : 0,
      })),
    [
      stats.data?.students?.pending,
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
    ].filter((item) => item.value > 0),
    [stats.data?.students?.boys, stats.data?.students?.girls],
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
              <MetricTile
                label="Students"
                value={stats.data.students?.total ?? stats.data.total_registered_students ?? 0}
                icon={<Users className="h-9 w-9" strokeWidth={1.8} />}
                tone="violet"
                helper="Registered profiles"
              />
              <MetricTile
                label="Live Members"
                value={stats.data.students?.live ?? stats.data.active_memberships ?? 0}
                icon={<CalendarCheck className="h-9 w-9" strokeWidth={1.8} />}
                tone="blue"
                helper="Currently active"
              />
            </>
          )}
          {canPayments && <MetricTile
            label="Revenue"
            value={formatMoney(stats.data.payments?.month_amount ?? 0)}
            icon={<CreditCard className="h-9 w-9" strokeWidth={1.8} />}
            tone="amber"
            helper={`${stats.data.payments?.month_count ?? 0} payments`}
          />}
          {canSeats && <MetricTile
            label="Seats"
            value={stats.data.seats?.available ?? stats.data.available_seats ?? 0}
            icon={<Armchair className="h-9 w-9" strokeWidth={1.8} />}
            tone="emerald"
            helper={`${stats.data.seats?.occupied ?? 0} occupied`}
          />}
        </div>
      ) : null}

      <div className="grid gap-7 lg:grid-cols-3">
        <SectionCard menu padding="lg"
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
            <div className="h-[340px] w-full min-w-0 flex-1">
              <ResponsiveContainer width="100%" height={340} minWidth={1} minHeight={1}>
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
        </SectionCard>

        {canStudents && (
          <SectionCard menu padding="lg" title="Analytics" className="lg:col-span-1">
            <div className="grid place-items-center">
              <div className="relative h-[220px] w-full max-w-[280px] min-w-0">
                <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
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
          </SectionCard>
        )}
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        <SectionCard menu padding="lg" title="Recent Activity">
          {activity.isLoading ? <LoadingBlock label="Loading activity" /> : null}
          {activity.error ? <ErrorState message="Unable to load activity." /> : null}
          {activity.data && (
          <div className="flex flex-col px-2 py-1 max-h-[380px] overflow-y-auto pr-3">
            {activity.data.slice(0, 15).map((item, index, arr) => (
              <ActivityRow key={item.id} item={item} isLast={index === arr.length - 1} />
            ))}
            {activity.data.length === 0 && (
              <div className="py-4 text-sm text-muted">No recent activity found.</div>
            )}
          </div>
          )}
        </SectionCard>

        <SectionCard menu padding="lg" title="Today's Attendance">
          {attendanceSummary.isLoading ? <LoadingBlock label="Loading summary" /> : null}
          {attendanceSummary.error ? <ErrorState message="Unable to load summary." /> : null}
          {attendanceSummary.data && (
            <div className="grid place-items-center py-4">
              <div className="relative h-[220px] w-full max-w-[280px] min-w-0">
                <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Present", value: attendanceSummary.data.present, chartValue: Math.max(attendanceSummary.data.present, 0) || 1 },
                        { name: "Absent", value: attendanceSummary.data.absent, chartValue: Math.max(attendanceSummary.data.absent, 0) }
                      ].map((item, _, arr) => ({
                        ...item,
                        chartValue: (arr[0].value === 0 && arr[1].value === 0) ? (item.name === "Present" ? 1 : 0) : item.chartValue
                      }))}
                      dataKey="chartValue"
                      innerRadius={72}
                      outerRadius={96}
                      paddingAngle={8}
                      cornerRadius={18}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill="#22c55e" /> {/* Present */}
                      <Cell fill="#dc2626" /> {/* Absent */}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-3xl font-black">{attendanceSummary.data.present + attendanceSummary.data.absent}</p>
                    <p className="mt-2 text-sm text-muted">Total Marked</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-5 text-sm" role="list" aria-label="Attendance status breakdown">
                <span className="inline-flex items-center gap-2" role="listitem">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#22c55e" }} aria-hidden="true" />
                  Present <span className="font-bold text-foreground">{attendanceSummary.data.present}</span>
                </span>
                <span className="inline-flex items-center gap-2" role="listitem">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} aria-hidden="true" />
                  Absent <span className="font-bold text-foreground">{attendanceSummary.data.absent}</span>
                </span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
