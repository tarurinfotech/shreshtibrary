"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowLeft, Camera, Clock, Upload } from "lucide-react";
import { StudentEditForm } from "@/components/features/students/StudentEditForm";
import { StudentAttendanceCalendar } from "@/components/features/students/StudentAttendanceCalendar";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ChartPanel } from "@/components/ui/ChartWidgets";
import { FileInput } from "@/components/ui/FileInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { getErrorMessage } from "@/lib/api";
import { endpoints, type StudentUpdatePayload } from "@/lib/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { useToastStore } from "@/store/toastStore";
import type { StudentAnalytics } from "@/types/api";

const periods: Array<{ value: StudentAnalytics["period"]; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function StudentDetailClient({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [photo, setPhoto] = useState<File | null>(null);
  const [period, setPeriod] = useState<StudentAnalytics["period"]>("weekly");
  const student = useQuery({ queryKey: ["student", id], queryFn: () => endpoints.student(id) });
  const timeline = useQuery({ queryKey: ["student-timeline", id], queryFn: () => endpoints.studentTimeline(id) });
  const payments = useQuery({ queryKey: ["student-payments", id], queryFn: () => endpoints.studentPayments(id) });
  const attendance = useQuery({ queryKey: ["student-attendance", id], queryFn: () => endpoints.studentAttendance(id) });
  const memberships = useQuery({ queryKey: ["student-memberships", id], queryFn: () => endpoints.studentMemberships(Number(id)) });
  const analytics = useQuery({
    queryKey: ["student-analytics", id, period],
    queryFn: () => endpoints.studentAnalytics(id, period),
  });

  const update = useMutation({
    mutationFn: (payload: StudentUpdatePayload) => endpoints.updateStudent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      pushToast({ kind: "success", title: "Student updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) }),
  });

  const uploadPhoto = useMutation({
    mutationFn: (file: File) => endpoints.uploadStudentPhoto(id, file),
    onSuccess: () => {
      setPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      pushToast({ kind: "success", title: "Profile image updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Upload failed", message: getErrorMessage(error) }),
  });

  if (student.isLoading) {
    return <LoadingBlock label="Loading student" />;
  }

  if (student.error || !student.data) {
    return <ErrorState message="Unable to load this student." />;
  }

  const studentName = [student.data.first_name, student.data.middle_name, student.data.last_name].filter(Boolean).join(" ") || student.data.username;

  return (
    <>
      <PageHeader
        title={studentName}
        eyebrow={student.data.student_id ?? "Student Detail"}
        actions={
          <Link href="/dashboard/students" className={buttonClasses({ variant: "secondary" })}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="surface rounded-lg p-5">
          <div className="flex flex-col items-center text-center">
            <ProfileAvatar
              src={student.data.profile_image ?? student.data.profile_photo}
              name={studentName}
              size="2xl"
              shape="circle"
              status={student.data.status}
              asBackground
            />
            <h2 className="mt-3 text-lg font-semibold">{studentName}</h2>
            <Badge variant={statusVariant(student.data.status)}>{student.data.status}</Badge>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-panel-strong p-3">
            <FileInput
              accept="image/*"
              label="Profile Image"
              fileName={photo ? `${photo.name} selected` : null}
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
            <Button
              className="mt-3 w-full"
              disabled={!photo}
              icon={<Upload className="h-4 w-4" />}
              loading={uploadPhoto.isPending}
              onClick={() => photo && uploadPhoto.mutate(photo)}
              type="button"
            >
              Upload Image
            </Button>
          </div>

          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-muted">Username</dt>
              <dd className="mt-1">{student.data.username}</dd>
            </div>
            <div>
              <dt className="text-muted">Mobile</dt>
              <dd className="mt-1">{student.data.mobile}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="mt-1">{student.data.email || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted">Date of Birth</dt>
              <dd className="mt-1">{formatDate(student.data.dob)}</dd>
            </div>
            <div>
              <dt className="text-muted">Referral Code</dt>
              <dd className="mt-1">{student.data.referral_code ?? "Not set"}</dd>
            </div>
          </dl>
        </aside>

        <StudentEditForm
          key={student.data.updated_at || student.data.user_id}
          student={student.data}
          saving={update.isPending}
          onSubmit={(payload) => update.mutate(payload)}
        />
      </div>

      <section className="surface rounded-lg p-5">
        <h2 className="mb-4 font-semibold">Plan Details</h2>
        <TableShell className="rounded-none border-0 bg-transparent">
          <Table>
            <thead>
              <tr>
                <Th>Plan Name</Th>
                <Th>Status</Th>
                <Th>Start Date</Th>
                <Th>Expiry Date</Th>
              </tr>
            </thead>
            <tbody>
              {(memberships.data?.data ?? []).map((membership) => (
                <tr key={membership.id}>
                  <Td className="font-medium">{membership.plan_name}</Td>
                  <Td><Badge variant={statusVariant(membership.status)}>{membership.status}</Badge></Td>
                  <Td>{formatDate(membership.start_date)}</Td>
                  <Td>{formatDate(membership.end_date)}</Td>
                </tr>
              ))}
              {memberships.isSuccess && memberships.data?.data?.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-muted text-sm border-b border-border">No active or historical plans found for this student.</td>
                </tr>
              )}
              {memberships.isLoading && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-muted text-sm border-b border-border">Loading plan details...</td>
                </tr>
              )}
            </tbody>
          </Table>
        </TableShell>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="surface rounded-lg p-5">
          <h2 className="mb-4 font-semibold">Timeline</h2>
          <div className="grid gap-3">
            {(timeline.data ?? []).slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-panel-strong p-3">
                <p className="text-sm font-medium">{item.action}</p>
                <p className="mt-1 text-xs text-muted">{item.description || formatDate(item.created_at)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface rounded-lg p-5 xl:col-span-2">
          <h2 className="mb-4 font-semibold">Payments</h2>
          <TableShell className="rounded-none border-0 bg-transparent">
            <Table>
              <thead>
                <tr>
                  <Th>Plan</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {(payments.data ?? []).slice(0, 8).map((payment) => (
                  <tr key={payment.id}>
                    <Td>{payment.plan_name}</Td>
                    <Td>{formatMoney(payment.amount)}</Td>
                    <Td><Badge variant={statusVariant(payment.status)}>{payment.status}</Badge></Td>
                    <Td>{formatDate(payment.payment_date)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </section>
      </div>

      <section className="surface rounded-lg p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Student Analytics</h2>
            <p className="mt-1 text-sm text-muted">Attendance and study hours by selected range.</p>
          </div>
          <Select
            className="min-w-36"
            label="Range"
            value={period}
            onChange={(value) => setPeriod(value as StudentAnalytics["period"])}
            options={periods}
          />
        </div>

        {analytics.isLoading ? <LoadingBlock label="Loading analytics" /> : null}
        {analytics.error ? <ErrorState message="Unable to load student analytics." /> : null}
        {!analytics.isLoading && !analytics.error ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartPanel title="Attendance" icon={<Activity className="h-4 w-4" />}>
              <div className="h-full">
                <StudentAttendanceCalendar records={attendance.data ?? []} joiningDate={student.data?.joining_date ?? undefined} />
              </div>
            </ChartPanel>

            <ChartPanel title="Study Hours" icon={<Clock className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.data?.study ?? []} margin={{ left: -20, right: 10 }}>
                  <defs>
                    <linearGradient id="studyHoursGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4", fill: "transparent" }}
                    contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="hours" name="Study hours" stroke="var(--primary)" strokeWidth={3} fill="url(#studyHoursGradient)" />
                  <Area type="monotone" dataKey="target_hours" name="Target hours" stroke="var(--success)" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        ) : null}
      </section>

      <section className="surface rounded-lg p-5">
        <h2 className="mb-4 font-semibold">Attendance</h2>
        <TableShell className="rounded-none border-0 bg-transparent">
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Time</Th>
                <Th>Method</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {(attendance.data ?? []).slice(0, 12).map((record) => (
                <tr key={record.id}>
                  <Td>{formatDate(record.date)}</Td>
                  <Td>{record.time_in ?? "Not set"}</Td>
                  <Td>{record.method}</Td>
                  <Td><Badge variant={record.is_present ? "success" : "danger"}>{record.is_present ? "Present" : "Absent"}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableShell>
      </section>
    </>
  );
}
