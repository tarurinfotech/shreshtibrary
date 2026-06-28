"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
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
  ListItem,
  MetricCard,
  MiniAreaChart,
  OverviewRow,
  ProgressRing,
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
import type { AttendanceRecord, PaymentRecord, SeatReport } from "@/types/api";

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

  const attendance = useQuery({ queryKey: ["attendance-report"], queryFn: () => endpoints.attendance({ page_size: 100 }), enabled: canAttendance });
  const payments = useQuery({ queryKey: ["payment-report"], queryFn: () => endpoints.payments({ page_size: 100 }), enabled: canPayments });
  const students = useQuery({ queryKey: ["students-report"], queryFn: () => endpoints.students({ page_size: 100 }), enabled: canStudents });
  const memberships = useQuery({ queryKey: ["memberships-report"], queryFn: () => endpoints.memberships({ page_size: 100 }), enabled: canPlans });
  const daily = useQuery({ queryKey: ["daily-summary-report"], queryFn: endpoints.dailySummaryReport });
  const seats = useQuery({ queryKey: ["seat-report"], queryFn: endpoints.seatReport, enabled: canSeats });

  const attendanceRows = useMemo(() => attendance.data?.data ?? [], [attendance.data?.data]);
  const paymentRows = useMemo(() => payments.data?.data ?? [], [payments.data?.data]);
  const studentRows = useMemo(() => students.data?.data ?? [], [students.data?.data]);
  const membershipRows = useMemo(() => memberships.data?.data ?? [], [memberships.data?.data]);
  const seatRows = useMemo(() => seats.data ?? [], [seats.data]);
  const visibleDays = Number(range);

  const attendanceByDate = useMemo(
    () => buildAttendanceSeries(attendanceRows, visibleDays),
    [attendanceRows, visibleDays],
  );
  const revenueByMonth = useMemo(() => buildRevenueSeries(paymentRows), [paymentRows]);
  const paymentByStatus = useMemo(() => buildStatusMoney(paymentRows), [paymentRows]);
  const studentStatus = useMemo(() => buildStatusCount(studentRows, (student) => student.status), [studentRows]);
  const membershipStatus = useMemo(() => buildStatusCount(membershipRows, (membership) => membership.status), [membershipRows]);

  const seatTotals = useMemo(() => sumSeatReport(seatRows), [seatRows]);
  const totalRevenue = paymentRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const verifiedRevenue = paymentRows
    .filter((payment) => payment.status.toLowerCase() === "verified")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const presentTotal = attendanceRows.filter((record) => record.is_present).length;
  const attendanceRate = attendanceRows.length ? Math.round((presentTotal / attendanceRows.length) * 100) : 0;
  const occupiedSeatRate = seatTotals.total ? Math.round((seatTotals.occupied / seatTotals.total) * 100) : 0;
  const activeMemberships = membershipRows.filter((item) => item.status.toLowerCase() === "active").length;
  const activeMembershipRate = membershipRows.length ? Math.round((activeMemberships / membershipRows.length) * 100) : 0;
  const absentTotal = Math.max(attendanceRows.length - presentTotal, 0);

  const loading = attendance.isLoading || payments.isLoading || students.isLoading || memberships.isLoading || daily.isLoading || seats.isLoading;
  const hasError = attendance.error || payments.error || students.error || memberships.error || daily.error || seats.error;

  return (
    <>
      <PageHeader
        title="Reports"
        eyebrow="Analytics"
        actions={
          <div className="flex flex-wrap gap-2">
            {[
              ...(canAttendance ? ["attendance"] : []),
              ...(canPayments ? ["payments"] : []),
              ...(canStudents ? ["students"] : []),
              ...(canPlans ? ["memberships"] : [])
            ].map((kind) => (
              <Button key={kind} variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => endpoints.exportReport(kind)}>
                {kind}
              </Button>
            ))}
          </div>
        }
      />

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-panel/70 p-2.5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Compact report board</p>
          <p className="text-xs text-muted">All key charts stay visible together while the range updates the trend data.</p>
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

      {loading ? <LoadingBlock label="Loading reports" /> : null}
      {hasError ? <ErrorState message="Unable to load one or more reports." /> : null}

      <section className="flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:basis-[300px]">
        {canAttendance && <MetricCard
          delay={0}
          icon={<Activity className="h-4 w-4" />}
          label="Attendance"
          value={`${attendanceRate}%`}
          helper={`${presentTotal} present`}
          tone="text-blue-600 bg-blue-500/15"
          ring={attendanceRate}
        />}
        {canPayments && <ReportCard delay={1} title="Revenue Flow" eyebrow="Collections">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xl font-semibold">{formatMoney(totalRevenue)}</p>
              <p className="mt-1 text-xs text-success">{formatMoney(verifiedRevenue)} verified</p>
            </div>
            <Badge variant="success">{paymentRows.length}</Badge>
          </div>
          <div className="mt-3 h-20">
            <MiniAreaChart data={revenueByMonth} dataKey="amount" />
          </div>
        </ReportCard>}
        {canSeats && <ReportCard delay={2} title="Seats Usage" eyebrow="Occupancy">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xl font-semibold">{occupiedSeatRate}%</p>
              <p className="mt-1 text-xs text-muted">{seatTotals.occupied} / {seatTotals.total} occupied</p>
            </div>
            <ProgressRing value={occupiedSeatRate} color="var(--accent-rose)" />
          </div>
          <div className="mt-3 grid gap-2 text-xs">
            <TinyProgress label="Available" value={seatTotals.available} total={seatTotals.total} color="var(--success)" />
            <TinyProgress label="Reserved" value={seatTotals.reserved} total={seatTotals.total} color="var(--warning)" />
          </div>
        </ReportCard>}
        {canPlans && <MetricCard
          delay={3}
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Memberships"
          value={`${activeMemberships}`}
          helper={`${membershipRows.length} records`}
          tone="text-violet-600 bg-violet-500/15"
          ring={activeMembershipRate}
        />}
      </section>

      <section className="flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:basis-[400px]">
        {canAttendance && <ReportCard delay={4} title="Attendance Report" eyebrow="Daily present / absent">
          <div className="h-[240px] 2xl:h-[260px]">
            {attendanceByDate.length ? (
              <ResponsiveContainer width="100%" height="100%">
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
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="var(--accent-yellow)" strokeWidth={2} fill="url(#reportsAbsentFill)" />
                  <Line type="monotone" dataKey="total" name="Total" stroke="var(--accent-violet)" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label="No attendance report data" />}
          </div>
        </ReportCard>}

        {canPayments && <ReportCard delay={5} title="Payment Totals" eyebrow="By status">
          <div className="h-[240px] 2xl:h-[260px]">
            {paymentByStatus.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentByStatus} margin={{ left: -24, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `INR ${Number(value) / 1000}k`} />
                  <Tooltip content={<ReportTooltip money />} cursor={{ fill: "var(--foreground)", opacity: 0.04 }} />
                  <Bar dataKey="amount" radius={[7, 7, 0, 0]}>
                    {paymentByStatus.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label="No payment totals" />}
          </div>
        </ReportCard>}

        <ReportCard delay={6} title="Operations Overview" eyebrow="Current totals">
          <div className="grid gap-2">
            {canStudents && <OverviewRow icon={<Users className="h-4 w-4" />} label="Students" value={studentRows.length} tone="text-blue-600 bg-blue-500/15" />}
            {canPlans && <OverviewRow icon={<ShieldCheck className="h-4 w-4" />} label="Active Memberships" value={activeMemberships} tone="text-violet-600 bg-violet-500/15" />}
            {canPayments && <OverviewRow icon={<ReceiptText className="h-4 w-4" />} label="Payment Records" value={paymentRows.length} tone="text-emerald-600 bg-emerald-500/15" />}
            {canSeats && <OverviewRow icon={<Armchair className="h-4 w-4" />} label="Seat Floors" value={seatRows.length} tone="text-amber-600 bg-amber-500/15" />}
          </div>
          <div className="mt-3 rounded-lg border border-border bg-panel-strong p-3">
            <p className="text-xs font-semibold uppercase text-muted">Daily Summary</p>
            <div className="mt-2 grid gap-1.5">
              {Object.entries(daily.data ?? {}).slice(0, 5).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="capitalize text-muted">{key.replaceAll("_", " ")}</span>
                  <span className="font-semibold">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </ReportCard>
      </section>

      <section className="flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:basis-[300px]">
        {canStudents && <ReportCard delay={7} title="Student Status" eyebrow="Distribution">
          <div className="grid gap-3 xl:grid-cols-[1fr_120px]">
            <div className="h-36">
              <DonutChart data={studentStatus} />
            </div>
            <LegendList data={studentStatus} />
          </div>
        </ReportCard>}

        {canAttendance && <ReportCard delay={8} title="Attendance Split" eyebrow="Record count">
          <div className="grid gap-3 xl:grid-cols-[1fr_120px]">
            <div className="h-36">
              <DonutChart data={[
                { label: "Present", value: presentTotal },
                { label: "Absent", value: absentTotal },
              ]} />
            </div>
            <LegendList data={[
              { label: "Present", value: presentTotal },
              { label: "Absent", value: absentTotal },
            ]} />
          </div>
        </ReportCard>}

        {canPlans && <ReportCard delay={9} title="Membership Mix" eyebrow="Status count">
          <div className="grid gap-2">
            {membershipStatus.length ? membershipStatus.map((item, index) => (
              <TinyProgress
                key={item.label}
                label={item.label}
                value={item.value}
                total={membershipRows.length}
                color={palette[(index + 3) % palette.length]}
              />
            )) : <ChartEmpty label="No membership data" />}
          </div>
        </ReportCard>}

        {canPayments && <ReportCard delay={10} title="Revenue Months" eyebrow="Monthly collection">
          <div className="h-36">
            <MiniAreaChart data={revenueByMonth} dataKey="amount" />
          </div>
        </ReportCard>}
      </section>

      <section className="flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:basis-[380px]">
        {canSeats && <ReportCard delay={11} title="Seat Layout" eyebrow="By floor">
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

        {canPayments && <ReportCard delay={12} title="Recent Payments" eyebrow="Latest records">
          <div className="grid gap-2">
            {paymentRows.slice(0, 4).map((payment, index) => (
              <ListItem
                key={payment.id}
                icon={<ReceiptText className="h-4 w-4" />}
                title={payment.student_name}
                meta={`${payment.plan_name} / ${formatDate(payment.payment_date)}`}
                value={formatMoney(payment.amount)}
                tone={palette[index % palette.length]}
              />
            ))}
            {!paymentRows.length ? <ChartEmpty label="No payment records" /> : null}
          </div>
        </ReportCard>}

        {canStudents && <ReportCard delay={13} title="Students Snapshot" eyebrow="Latest students">
          <div className="grid gap-2">
            {studentRows.slice(0, 4).map((student, index) => (
              <ListItem
                key={student.user_id}
                icon={<Users className="h-4 w-4" />}
                title={fullName(student.first_name, student.last_name, student.username)}
                meta={`${student.student_id ?? student.username} / ${student.goal}`}
                value={student.status}
                tone={palette[(index + 2) % palette.length]}
              />
            ))}
            {!studentRows.length ? <ChartEmpty label="No student records" /> : null}
          </div>
        </ReportCard>}
      </section>

      <section className="flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:basis-[500px]">
        {canPlans && <TableSection title="Membership Records" icon={<ShieldCheck className="h-5 w-5" />}>
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
                    <Td>{membership.student_name}</Td>
                    <Td>{membership.plan_name}</Td>
                    <Td>{formatDate(membership.start_date)} - {formatDate(membership.end_date)}</Td>
                    <Td><Badge variant={statusVariant(membership.status)}>{membership.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </TableSection>}

        {canStudents && <TableSection title="Student Records" icon={<FileSpreadsheet className="h-5 w-5" />}>
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
                    <Td>{student.student_id}</Td>
                    <Td>{fullName(student.first_name, student.last_name, student.username)}</Td>
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

function buildAttendanceSeries(rows: AttendanceRecord[], days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);

  const counts = rows.reduce<Record<string, { date: string; present: number; absent: number; total: number }>>((acc, record) => {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime()) || date < cutoff) {
      return acc;
    }
    acc[record.date] ??= { date: record.date, present: 0, absent: 0, total: 0 };
    acc[record.date].total += 1;
    if (record.is_present) {
      acc[record.date].present += 1;
    } else {
      acc[record.date].absent += 1;
    }
    return acc;
  }, {});

  return Object.values(counts)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({ ...item, label: shortDate(item.date) }));
}

function buildRevenueSeries(rows: PaymentRecord[]) {
  const months = new Map<string, { label: string; amount: number; count: number }>();
  rows.forEach((payment) => {
    const date = new Date(payment.payment_date);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, {
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      amount: (months.get(key)?.amount ?? 0) + Number(payment.amount || 0),
      count: (months.get(key)?.count ?? 0) + 1,
    });
  });
  return Array.from(months.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, value]) => value);
}

function buildStatusMoney(rows: PaymentRecord[]) {
  const totals = rows.reduce<Record<string, number>>((acc, payment) => {
    acc[payment.status] = (acc[payment.status] ?? 0) + Number(payment.amount || 0);
    return acc;
  }, {});
  return Object.entries(totals).map(([label, amount]) => ({ label, amount }));
}

function buildStatusCount<T>(rows: T[], getStatus: (row: T) => string) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const status = getStatus(row) || "Unknown";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

function sumSeatReport(rows: SeatReport) {
  return rows.reduce(
    (acc, floor) => ({
      total: acc.total + floor.total,
      occupied: acc.occupied + floor.occupied,
      available: acc.available + floor.available,
      reserved: acc.reserved + floor.reserved,
    }),
    { total: 0, occupied: 0, available: 0, reserved: 0 },
  );
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
