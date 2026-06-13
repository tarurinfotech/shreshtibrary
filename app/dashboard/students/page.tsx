"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Eye,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  Activity,
  Clock,
  Ban,
  Search,
  SlidersHorizontal,
  GraduationCap,
  Phone,
  Mail,

} from "lucide-react";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Dialog";

import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FilterSelect, Select } from "@/components/ui/Select";
import { getErrorMessage } from "@/lib/api";
import { endpoints, type StudentCreatePayload } from "@/lib/endpoints";
import { fullName } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { StudentProfile } from "@/types/api";

const emptyStudent: StudentCreatePayload = {
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  goal: "Other",
  gender: "Other",
  parent_mobile: "",
  address: "",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  gradient,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  loading?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 flex items-center gap-4"
      style={{
        background: gradient,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20"
        style={{ background: "rgba(255,255,255,0.4)" }}
      />
      <div
        className="absolute -right-2 top-8 h-14 w-14 rounded-full opacity-10"
        style={{ background: "rgba(255,255,255,0.6)" }}
      />

      <div
        className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
        style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)" }}
      >
        {icon}
      </div>

      <div className="relative flex flex-col min-w-0">
        <div className="text-sm font-medium text-white/90">
          {label}
        </div>
        {loading ? (
          <div className="h-7 w-16 animate-pulse rounded bg-white/20 mt-1" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-white leading-none mt-1">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Gender Bar ───────────────────────────────────────────────────────────────
function GenderBar({
  label,
  value,
  total,
  color,
  emoji,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  emoji: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <span>{emoji}</span> {label}
        </span>
        <span className="font-bold" style={{ color }}>
          {value} <span className="text-xs font-normal opacity-60">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Student Row Card ─────────────────────────────────────────────────────────
function StudentRowCard({
  student,
  onSuspend,
  onActivate,
  onDelete,
  suspendPending,
  activatePending,
  deletePending,
  isSuperAdmin,
}: {
  student: StudentProfile;
  onSuspend: () => void;
  onActivate: () => void;
  onDelete: () => void;
  suspendPending: boolean;
  activatePending: boolean;
  deletePending: boolean;
  isSuperAdmin: boolean;
}) {
  const name = fullName(student.first_name, student.last_name);
  const statusColorMap: Record<string, string> = {
    LIVE: "var(--success)",
    EXPIRED: "var(--warning)",
    SUSPENDED: "var(--danger)",
  };
  const statusColor = statusColorMap[student.status] ?? "var(--muted)";

  return (
    <div
      className="group relative flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border bg-panel p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: statusColor }}
      />

      {/* Avatar + Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ProfileAvatar
          src={student.profile_image ?? student.profile_photo}
          name={[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || student.username}
          size="md"
          status={student.status}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm">{name}</p>
          <p className="truncate text-xs text-muted mt-0.5">
            {student.student_id ?? `#${student.user_id}`} · @{student.username}
          </p>
        </div>
      </div>

      {/* Contact */}
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="flex items-center gap-1.5 text-xs">
          <Phone className="h-3 w-3 text-muted" />
          <span className="text-sm font-medium">{student.mobile}</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Mail className="h-3 w-3" />
          <span className="truncate">{student.email || "—"}</span>
        </span>
      </div>

      {/* Goal */}
      <div className="flex items-center gap-1.5 min-w-[100px]">
        <GraduationCap className="h-4 w-4 text-muted shrink-0" />
        <span className="text-sm">{student.goal || "—"}</span>
      </div>

      {/* Status badge */}
      <div className="min-w-[90px]">
        <Badge variant={statusVariant(student.status)}>{student.status}</Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/dashboard/students/${student.user_id}`}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Link>

        {student.status === "SUSPENDED" ? (
          <Button
            size="sm"
            variant="success"
            loading={activatePending}
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            onClick={onActivate}
          >
            Activate
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            loading={suspendPending}
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            onClick={onSuspend}
          >
            Suspend
          </Button>
        )}

        {isSuperAdmin && (
          <Button
            size="sm"
            variant="danger"
            loading={deletePending}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [goal, setGoal] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StudentCreatePayload>(emptyStudent);
  const [suspendTarget, setSuspendTarget] = useState<StudentProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentProfile | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const students = useQuery({
    queryKey: ["students", search, status, goal],
    queryFn: () =>
      endpoints.students({
        search: search || undefined,
        status: status || undefined,
        goal: goal || undefined,
        page_size: 50,
      }),
  });
  const counts = useQuery({ queryKey: ["student-counts"], queryFn: endpoints.studentCounts });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: () => endpoints.createStudent(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      setForm(emptyStudent);
      setOpen(false);
      pushToast({ kind: "success", title: "Student created" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Create failed", message: getErrorMessage(error) }),
  });

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => endpoints.suspendStudent(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      setSuspendTarget(null);
      pushToast({ kind: "success", title: "Student suspended" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Suspend failed", message: getErrorMessage(error) }),
  });

  const activate = useMutation({
    mutationFn: (id: number) => endpoints.activateStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      pushToast({ kind: "success", title: "Student activated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Activate failed", message: getErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => endpoints.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      setDeleteTarget(null);
      pushToast({ kind: "success", title: "Student deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    create.mutate();
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const rows = students.data?.data ?? [];
  const genderRows = [
    { label: "Girls", value: counts.data?.girls ?? 0, color: "#f472b6", emoji: "👩" },
    { label: "Boys", value: counts.data?.boys ?? 0, color: "#38bdf8", emoji: "👦" },
    { label: "Other", value: counts.data?.other ?? 0, color: "#a78bfa", emoji: "🌈" },
  ].filter((item) => item.value > 0);
  const genderTotal = genderRows.reduce((sum, item) => sum + item.value, 0);
  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
            Profiles
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">Students</h1>
          <p className="mt-0.5 text-sm text-muted">
            Manage all student profiles, memberships and status
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={() => endpoints.exportStudents()}
          >
            Export
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Add Student
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard
          label="Total"
          value={counts.data?.total ?? 0}
          icon={<Users className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          loading={counts.isLoading}
        />
        <StatCard
          label="Live"
          value={counts.data?.live ?? 0}
          icon={<Activity className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
          loading={counts.isLoading}
        />
        <StatCard
          label="Expired"
          value={counts.data?.expired ?? 0}
          icon={<Clock className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #f7971e 0%, #ffd200 100%)"
          loading={counts.isLoading}
        />
        <StatCard
          label="Suspended"
          value={counts.data?.suspended ?? 0}
          icon={<Ban className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #f953c6 0%, #b91d73 100%)"
          loading={counts.isLoading}
        />
      </div>

      {/* ── Gender Analytics ─────────────────────────────────────────────────── */}
      <div
        className="mb-4 rounded-xl border border-border p-4"
        style={{ background: "var(--surface-sheen), var(--panel)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-base">Gender Distribution</h2>
            <p className="text-xs text-muted mt-0.5">Based on student profile data</p>
          </div>
          <div
            className="rounded-xl px-4 py-2 text-sm font-bold"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            {genderTotal} students
          </div>
        </div>

        {genderRows.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {genderRows.map((item) => (
              <GenderBar
                key={item.label}
                label={item.label}
                value={item.value}
                total={genderTotal}
                color={item.color}
                emoji={item.emoji}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-4">No gender data available yet.</p>
        )}
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────────── */}
      <div
        className="mb-4 rounded-xl border border-border p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end"
        style={{ background: "var(--panel)" }}
      >
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <input
            id="student-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, mobile, email…"
            className="w-full rounded-xl border border-border bg-panel-strong pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Status filter */}
        <FilterSelect
          id="student-status-filter"
          value={status}
          onChange={setStatus}
          placeholder="All Status"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          options={[
            { value: "", label: "All Status" },
            { value: "LIVE", label: "Live" },
            { value: "EXPIRED", label: "Expired" },
            { value: "SUSPENDED", label: "Suspended" },
          ]}
          className="min-w-[150px]"
        />

        {/* Goal filter */}
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted shrink-0" />
          <input
            id="student-goal-filter"
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Filter by goal…"
            className="rounded-xl border border-border bg-panel-strong px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors w-40"
          />
        </div>
      </div>

      {/* ── Students List ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Header row */}
        <div className="hidden sm:flex items-center gap-4 px-4 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted flex-1 min-w-0">Student</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted min-w-[160px]">Contact</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted min-w-[100px]">Goal</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted min-w-[90px]">Status</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Actions</span>
        </div>

        {students.isLoading ? (
          // Skeleton loader
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[76px] rounded-xl border border-border bg-panel animate-pulse" />
          ))
        ) : students.error ? (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-8 text-center">
            <p className="text-sm font-medium text-danger">Unable to load students.</p>
            <button
              onClick={() => students.refetch()}
              className="mt-2 text-xs text-muted underline"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-panel p-12 text-center">
            <Users className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="font-semibold">No students found</p>
            <p className="text-sm text-muted mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          rows.map((student) => (
            <StudentRowCard
              key={student.user_id}
              student={student}
              onSuspend={() => setSuspendTarget(student)}
              onActivate={() => activate.mutate(student.user_id)}
              onDelete={() => setDeleteTarget(student)}
              suspendPending={suspend.isPending}
              activatePending={activate.isPending}
              deletePending={remove.isPending}
              isSuperAdmin={isSuperAdmin}
            />
          ))
        )}
      </div>

      {/* Result count */}
      {rows.length > 0 && (
        <p className="mt-4 text-xs text-muted text-center">
          Showing {rows.length} student{rows.length !== 1 ? "s" : ""}
          {search || status || goal ? " (filtered)" : ""}
        </p>
      )}

      {/* ── Add Student Modal ─────────────────────────────────────────────────── */}
      <Modal open={open} title="Add Student" onClose={() => setOpen(false)}>
        <FormShell onSubmit={submit}>
          <FormGrid columns={2}>
            <Input
              label="First Name"
              value={form.first_name ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, first_name: e.target.value }))}
              required
            />
            <Input
              label="Last Name"
              value={form.last_name ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, last_name: e.target.value }))}
            />
            <Input
              label="Mobile"
              value={form.mobile}
              onChange={(e) => setForm((c) => ({ ...c, mobile: e.target.value }))}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
            />
            <Input
              label="Goal"
              value={form.goal ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, goal: e.target.value }))}
            />
            <Select
              label="Gender"
              value={form.gender ?? "Other"}
              onChange={(v) => setForm((c) => ({ ...c, gender: v }))}
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
            />
            <Input
              label="Parent Mobile"
              value={form.parent_mobile ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, parent_mobile: e.target.value }))}
            />
            <Input
              label="Password"
              type="password"
              value={form.password ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
            />
          </FormGrid>
          <Input
            label="Address"
            value={form.address ?? ""}
            onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
          />
          <FormActions>
            <Button type="submit" loading={create.isPending} icon={<Plus className="h-4 w-4" />}>
              Create Student
            </Button>
          </FormActions>
        </FormShell>
      </Modal>

      {/* ── Suspend Dialog ────────────────────────────────────────────────────── */}
      <PromptDialog
        open={Boolean(suspendTarget)}
        title="Suspend Student"
        message={suspendTarget ? `Provide a reason for suspending ${suspendTarget.username}.` : undefined}
        label="Suspension Reason"
        confirmLabel="Suspend"
        loading={suspend.isPending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(reason) => suspendTarget && suspend.mutate({ id: suspendTarget.user_id, reason })}
      />

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Student"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.username}? This action cannot be undone.`
            : "Delete this student?"
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.user_id)}
      />
    </>
  );
}
