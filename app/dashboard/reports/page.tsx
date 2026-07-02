"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Armchair,
  Download,
  FileSpreadsheet,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  ChartEmpty,
  ChartTooltip as ReportTooltip,
  DonutChart,
  LegendList,
  MetricCard,
  ReportCard,
  TableSection,
  TinyProgress,
  reportPalette as palette,
} from "@/components/features/reports/ReportWidgets";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { useAuthStore } from "@/store/authStore";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import type { AttendanceRecord, MembershipRecord, PaymentRecord, SeatReport, StudentProfile } from "@/types/api";

type Range = "14" | "30" | "90";

export default function ReportsPage() {
  const [range, setRange] = useState<Range>("30");
  const user = useAuthStore((s) => s.user);
  const isSuper = user?.role === "super_admin";
  const hasPerm = (key: string) => isSuper || Boolean(user?.permissions?.[key]);

  const canAttendance = hasPerm("manage_attendance");
  const canPayments = hasPerm("manage_payments");
  const canStudents = hasPerm("manage_students");
  const canPlans = hasPerm("manage_plans");
  const canSeats = hasPerm("manage_seats");

  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => endpoints.dashboardStats() });
  const charts = useQuery({ queryKey: ["dashboard-charts", range], queryFn: () => endpoints.dashboardCharts(range === "14" ? "week" : (range === "30" ? "month" : "month")) });
  const attendance = useQuery({ queryKey: ["report-attendance"], queryFn: () => endpoints.report("attendance", { page_size: 5 }), enabled: canAttendance });
  const payments = useQuery({ queryKey: ["report-payments"], queryFn: () => endpoints.report("payments", { page_size: 100 }), enabled: canPayments });
  const students = useQuery({ queryKey: ["report-students"], queryFn: () => endpoints.report("students", { page_size: 5 }), enabled: canStudents });
  const memberships = useQuery({ queryKey: ["report-memberships"], queryFn: () => endpoints.report("memberships", { page_size: 5 }), enabled: canPlans });
  const seats = useQuery({ queryKey: ["report-seats"], queryFn: endpoints.seatReport, enabled: canSeats });

  const attendanceRows = useMemo(() => (attendance.data?.data ?? []) as AttendanceRecord[], [attendance.data?.data]);
  const paymentRows = useMemo(() => (payments.data?.data ?? []) as PaymentRecord[], [payments.data?.data]);
  const studentRows = useMemo(() => (students.data?.data ?? []) as StudentProfile[], [students.data?.data]);
  const membershipRows = useMemo(() => (memberships.data?.data ?? []) as MembershipRecord[], [memberships.data?.data]);
  const seatRows = useMemo(() => seats.data ?? [], [seats.data]);

  const dashboardStats = stats.data;
  const dashboardTrends = charts.data;

  const attendanceByDate = useMemo(() => {
    if (!dashboardTrends?.attendance_trend) return [];
    return dashboardTrends.attendance_trend.labels.map((label: string, index: number) => ({
      label,
      present: dashboardTrends.attendance_trend.data[index]
    }));
  }, [dashboardTrends]);

  const revenueByMonth = useMemo(() => {
    if (!dashboardTrends?.revenue_trend) return [];
    return dashboardTrends.revenue_trend.labels.map((label: string, index: number) => ({
      label,
      amount: dashboardTrends.revenue_trend.data[index]
    }));
  }, [dashboardTrends]);

  const paymentByStatus = useMemo(() => buildStatusMoney(paymentRows), [paymentRows]);
  
  const studentStatus = useMemo(() => {
    if (!dashboardStats?.students) return [];
    const s = dashboardStats.students;
    return [
      { label: "Live", value: s.live },
      { label: "Pending", value: s.pending },
      { label: "Suspended", value: s.suspended },
      { label: "Expired", value: s.expired }
    ].filter(x => x.value > 0);
  }, [dashboardStats]);

  const totalRevenue = Number(dashboardStats?.payments?.month_amount || 0);
  const verifiedRevenue = totalRevenue; // month_amount is already verified revenue in backend

  const todayAttendanceTotal = (dashboardStats?.attendance?.today_present || 0) + (dashboardStats?.attendance?.today_absent || 0);
  const attendanceRate = todayAttendanceTotal > 0
    ? Math.round(((dashboardStats?.attendance?.today_present || 0) / todayAttendanceTotal) * 100)
    : 0;

  const occupiedSeatRate = dashboardStats?.seats?.total 
    ? Math.round((dashboardStats.seats.occupied / dashboardStats.seats.total) * 100) 
    : 0;

  const loading = attendance.isLoading || payments.isLoading || students.isLoading || memberships.isLoading || seats.isLoading || stats.isLoading || charts.isLoading;
  const hasError = attendance.error || payments.error || students.error || memberships.error || seats.error || stats.error || charts.error;

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        eyebrow="Dashboard"
        actions={
          <div className="flex flex-wrap gap-2">
            {[
              ...(canAttendance ? ["attendance"] : []),
              ...(canPayments ? ["payments"] : []),
              ...(canStudents ? ["students"] : []),
              ...(canPlans ? ["memberships"] : [])
            ].map((kind) => (
              <Button key={kind} variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => endpoints.exportReport(kind)}>
                {kind.charAt(0).toUpperCase() + kind.slice(1)}
              </Button>
            ))}
          </div>
        }
      />

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-panel/70 p-2.5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Library Outcomes</p>
          <p className="text-xs text-muted">A clear, graphical summary of your library's core performance metrics.</p>
        </div>
        <Select
          label="Range"
          hideLabel
          value={range}
          onChange={(v) => setRange(v as Range)}
          options={[
            { value: "14", label: "Last 14 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
          ]}
        />
      </div>

      {loading ? <LoadingBlock label="Loading reports..." /> : null}
      {hasError ? <ErrorState message="Unable to load one or more reports." /> : null}

      {/* KPI Row */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-3">
        {canAttendance && <MetricCard
          delay={0}
          icon={<Activity className="h-4 w-4" />}
          label="Overall Attendance"
          value={`${attendanceRate}%`}
          helper={`${dashboardStats?.attendance?.today_present || 0} records present today`}
          tone="text-blue-600 bg-blue-500/15"
          ring={attendanceRate}
        />}
        {canPayments && <MetricCard
          delay={1}
          icon={<ReceiptText className="h-4 w-4" />}
          label="Monthly Revenue"
          value={formatMoney(totalRevenue)}
          helper={`${dashboardStats?.payments?.month_count || 0} successful payments`}
          tone="text-emerald-600 bg-emerald-500/15"
        />}
        {canSeats && <MetricCard
          delay={2}
          icon={<Armchair className="h-4 w-4" />}
          label="Seat Occupancy"
          value={`${occupiedSeatRate}%`}
          helper={`${dashboardStats?.seats?.occupied || 0} / ${dashboardStats?.seats?.total || 0} occupied`}
          tone="text-rose-600 bg-rose-500/15"
          ring={occupiedSeatRate}
        />}
        {canPlans && <MetricCard
          delay={3}
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Active Students"
          value={`${dashboardStats?.students?.live || 0}`}
          helper={`Out of ${dashboardStats?.students?.total || 0} total`}
          tone="text-violet-600 bg-violet-500/15"
          ring={dashboardStats?.students?.total ? Math.round(((dashboardStats.students.live || 0) / dashboardStats.students.total) * 100) : 0}
        />}
      </section>

      {/* Trends Row */}
      <section className="mt-3 flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:basis-[400px]">
        {canAttendance && <ReportCard delay={4} title="Attendance Trends" eyebrow="Present vs Absent over time">
          <div className="h-[240px] 2xl:h-[260px]">
            {attendanceByDate.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <ComposedChart data={attendanceByDate} margin={{ left: -24, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportsPresentFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-sky)" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="var(--accent-sky)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="reportsAbsentFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-yellow)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--accent-yellow)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ReportTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4", fill: "transparent" }} />
                  <Area type="monotone" dataKey="present" name="Present" stroke="var(--accent-sky)" strokeWidth={2} fill="url(#reportsPresentFill)" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label="No attendance report data" />}
          </div>
        </ReportCard>}

        {canPayments && <ReportCard delay={5} title="Revenue Flow" eyebrow="Monthly Collections">
          <div className="h-[240px] 2xl:h-[260px]">
            {revenueByMonth.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={revenueByMonth} margin={{ left: -24, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                  <Tooltip content={<ReportTooltip money />} cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4", fill: "transparent" }} />
                  <Area type="monotone" dataKey="amount" name="Revenue" stroke="#10b981" strokeWidth={3} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label="No revenue data available" />}
          </div>
        </ReportCard>}
      </section>

      {/* Distribution Row */}
      <section className="mt-3 flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:basis-[300px]">
        {canStudents && <ReportCard delay={6} title="Student Status" eyebrow="Distribution Overview">
          <div className="grid gap-3 xl:grid-cols-[1fr_120px]">
            <div className="h-36">
              <DonutChart data={studentStatus} />
            </div>
            <LegendList data={studentStatus} />
          </div>
        </ReportCard>}

        {canPayments && <ReportCard delay={7} title="Payments by Status" eyebrow="Breakdown">
          <div className="h-36">
            {paymentByStatus.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={paymentByStatus} margin={{ left: -24, right: 8, top: 8, bottom: -10 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                  <Tooltip content={<ReportTooltip money />} cursor={{ fill: "var(--foreground)", opacity: 0.04 }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {paymentByStatus.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label="No payment data" />}
          </div>
        </ReportCard>}

        {canSeats && <ReportCard delay={8} title="Seat Occupancy" eyebrow="By floor">
          <div className="grid gap-2">
            {seatRows.length ? seatRows.map((floor, index) => (
              <TinyProgress
                key={floor.floor}
                label={floor.floor}
                value={floor.occupied}
                total={floor.total}
                color={palette[index % palette.length]}
              />
            )) : <ChartEmpty label="No seat report" />}
          </div>
        </ReportCard>}
      </section>

      {/* Data Tables Row */}
      <section className="mt-3 flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:basis-[500px]">
        {canPlans && <TableSection title="Recent Memberships" icon={<ShieldCheck className="h-5 w-5" />}>
          <TableShell className="rounded-none border-0 bg-transparent shadow-none">
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Plan</Th>
                  <Th>Dates</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {membershipRows.slice(0, 5).map((membership) => (
                  <tr key={membership.id}>
                    <Td className="font-medium">{membership.student_name}</Td>
                    <Td>{membership.plan_name}</Td>
                    <Td className="text-muted">{formatDate(membership.start_date)} - {formatDate(membership.end_date)}</Td>
                    <Td><Badge variant={statusVariant(membership.status)}>{membership.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </TableSection>}

        {canStudents && <TableSection title="Student Directory" icon={<FileSpreadsheet className="h-5 w-5" />}>
          <TableShell className="rounded-none border-0 bg-transparent shadow-none">
            <Table>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Name</Th>
                  <Th>Goal</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {studentRows.slice(0, 5).map((student) => (
                  <tr key={student.user_id}>
                    <Td className="text-muted">{student.student_id}</Td>
                    <Td className="font-medium">{fullName(student.first_name, student.last_name, student.username)}</Td>
                    <Td>{student.goal}</Td>
                    <Td><Badge variant={statusVariant(student.status)}>{student.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </TableSection>}
      </section>
    </>
  );
}

function buildStatusMoney(rows: PaymentRecord[]) {
  const totals = rows.reduce<Record<string, number>>((acc, payment) => {
    acc[payment.status] = (acc[payment.status] ?? 0) + Number(payment.amount || 0);
    return acc;
  }, {});
  return Object.entries(totals).map(([label, amount]) => ({ label, amount }));
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

