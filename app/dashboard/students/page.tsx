"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import axios from "axios";
import { useDebounce } from "@/lib/hooks";
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
  Target,
  RotateCcw,
} from "lucide-react";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Dialog";
import { FilterBar } from "@/components/ui/FilterBar";
import { EntityCard } from "@/components/ui/EntityCard";
import { GradientStatCard } from "@/components/ui/GradientStatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";

import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FilterSelect, Select } from "@/components/ui/Select";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
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

// Removed StudentRowCard entirely. We will render it directly in the table.

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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [suspendTarget, setSuspendTarget] = useState<StudentProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentProfile | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedGoal = useDebounce(goal, 400);
  const debouncedStatus = useDebounce(status, 100);

  // ── Queries ──────────────────────────────────────────────────────────────
  const students = useQuery({
    queryKey: ["students", debouncedSearch, debouncedStatus, debouncedGoal],
    queryFn: () =>
      endpoints.students({
        search: debouncedSearch || undefined,
        status: debouncedStatus || undefined,
        goal: debouncedGoal || undefined,
        page_size: 50,
      }),
  });
  const counts = useQuery({ queryKey: ["student-counts"], queryFn: endpoints.studentCounts });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: () => endpoints.createStudent(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      setForm(emptyStudent);
      setFormErrors({});
      setOpen(false);
      pushToast({ kind: "success", title: "Student created" });
    },
    onError: (error) => {
      setFormErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Create failed", message: getErrorMessage(error) });
    },
  });

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => endpoints.suspendStudent(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      setSuspendTarget(null);
      pushToast({ kind: "success", title: "Student suspended" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Suspend failed", message: getErrorMessage(error) }),
  });

  const activate = useMutation({
    mutationFn: (id: number) => endpoints.activateStudent(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      pushToast({ kind: "success", title: "Student activated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Activate failed", message: getErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => endpoints.deleteStudent(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      setDeleteTarget(null);
      pushToast({ kind: "success", title: "Student deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors({});
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
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
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
      <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <GradientStatCard
          label="Total"
          value={counts.data?.total ?? 0}
          icon={<Users className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          loading={counts.isLoading}
        />
        <GradientStatCard
          label="Live"
          value={counts.data?.live ?? 0}
          icon={<Activity className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
          loading={counts.isLoading}
        />
        <GradientStatCard
          label="Expired"
          value={counts.data?.expired ?? 0}
          icon={<Clock className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #f7971e 0%, #ffd200 100%)"
          loading={counts.isLoading}
        />
        <GradientStatCard
          label="Suspended"
          value={counts.data?.suspended ?? 0}
          icon={<Ban className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #f953c6 0%, #b91d73 100%)"
          loading={counts.isLoading}
        />
      </div>

      {/* ── Gender Analytics ─────────────────────────────────────────────────── */}
      <div
        className="mb-3 rounded-xl border border-border p-3"
        style={{ background: "var(--surface-sheen), var(--panel)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-2">
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
          <div className="flex flex-col gap-2">
            {genderRows.map((item) => (
              <ProgressBar
                key={item.label}
                label={item.label}
                value={item.value}
                total={genderTotal}
                color={item.color}
                icon={<span>{item.emoji}</span>}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-4">No gender data available yet.</p>
        )}
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────────── */}
      <FilterBar.Root>
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

        <FilterSelect
          id="student-goal-filter"
          value={goal}
          onChange={setGoal}
          placeholder="All Goals"
          icon={<GraduationCap className="h-4 w-4" />}
          options={[
            { value: "", label: "All Goals" },
            { value: "UPSC", label: "UPSC" },
            { value: "GPSC", label: "GPSC" },
            { value: "CONSTABLE", label: "Constable" },
            { value: "Banking", label: "Banking" },
            { value: "Army", label: "Army" },
            { value: "Teacher", label: "Teacher" },
            { value: "Railway", label: "Railway" },
            { value: "SSC", label: "SSC" },
            { value: "CA", label: "CA" },
            { value: "Other", label: "Other" },
          ]}
          className="min-w-[150px]"
        />
      </FilterBar.Root>

      {/* ── Students List ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-border bg-[#141b2d] text-[11px] font-bold uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Goal</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {students.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="p-4"><div className="h-10 bg-panel-strong animate-pulse rounded-md w-full" /></td>
                </tr>
              ))
            ) : students.error ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm font-medium text-danger">Unable to load students.</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-sm text-muted">No students found. Try adjusting your search or filters.</td>
              </tr>
            ) : (
              rows.map((student) => {
                const name = fullName(student.first_name, student.last_name);
                const isSuspendPending = suspend.isPending && suspend.variables?.id === student.user_id;
                const isActivatePending = activate.isPending && activate.variables === student.user_id;
                const isDeletePending = remove.isPending && remove.variables === student.user_id;
                
                return (
                  <tr key={student.user_id} className="transition-colors hover:bg-white/[0.02]">
                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProfileAvatar
                          src={student.profile_image ?? student.profile_photo}
                          name={[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || student.username}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white/90">{name}</div>
                          <div className="mt-0.5 truncate text-[11px] text-muted">SIR-ID: {student.student_id ?? student.user_id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 min-w-[160px]">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground/90">{student.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{student.email || "—"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Goal */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-foreground/90 min-w-[100px]">
                        <Target className="h-4 w-4 text-muted shrink-0" />
                        <span className="truncate font-medium">{student.goal || "—"}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="min-w-[90px]">
                        {student.status === "LIVE" ? (
                          <span className="inline-flex items-center rounded-md border border-[#10b981]/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#10b981] bg-transparent">LIVE</span>
                        ) : student.status === "SUSPENDED" ? (
                          <span className="inline-flex items-center rounded-md border border-[#e11d48]/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#e11d48] bg-transparent">SUSPENDED</span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-amber-500/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-500 bg-transparent">{student.status}</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <Link
                          href={`/dashboard/students/${student.user_id}`}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#334155] bg-transparent px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1e293b]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>

                        {student.status === "SUSPENDED" ? (
                          <Button
                            size="sm"
                            loading={isActivatePending}
                            disabled={isSuspendPending || isDeletePending}
                            icon={<RotateCcw className="h-3.5 w-3.5" />}
                            onClick={() => activate.mutate(student.user_id)}
                            className="h-8 !bg-[#4ade80] hover:!bg-[#22c55e] !border-none !text-white rounded-md px-3 text-xs font-semibold"
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            loading={isSuspendPending}
                            disabled={isActivatePending || isDeletePending}
                            icon={<ShieldAlert className="h-3.5 w-3.5" />}
                            onClick={() => setSuspendTarget(student)}
                            className="h-8 !bg-transparent !border border-[#334155] hover:!bg-[#1e293b] !text-white rounded-md px-3 text-xs font-semibold"
                          >
                            Suspend
                          </Button>
                        )}

                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            loading={isDeletePending}
                            disabled={isSuspendPending || isActivatePending}
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setDeleteTarget(student)}
                            className="h-8 !bg-[#fb7185] hover:!bg-[#f43f5e] !border-none !text-white rounded-md px-3 text-xs font-semibold"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
              error={formErrors.first_name}
              required
            />
            <Input
              label="Last Name"
              value={form.last_name ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, last_name: e.target.value }))}
              error={formErrors.last_name}
            />
            <Input
              label="Mobile"
              value={form.mobile}
              onChange={(e) => {
                setForm((c) => ({ ...c, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }));
                if (formErrors.mobile) setFormErrors((errs) => ({ ...errs, mobile: "" }));
              }}
              required
              pattern="[0-9]{10}"
              title="Mobile number must be exactly 10 digits"
              maxLength={10}
              minLength={10}
              error={formErrors.mobile}
            />
            <Input
              label="Email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              error={formErrors.email}
            />
            <Input
              label="Goal"
              value={form.goal ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, goal: e.target.value }))}
              error={formErrors.goal}
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
              onChange={(e) => setForm((c) => ({ ...c, parent_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              pattern="[0-9]{10}"
              title="Parent mobile number must be exactly 10 digits"
              maxLength={10}
              minLength={10}
              error={formErrors.parent_mobile}
            />
            <Input
              label="Password"
              type="password"
              value={form.password ?? ""}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              error={formErrors.password}
            />
          </FormGrid>
          <Input
            label="Address"
            value={form.address ?? ""}
            onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
            error={formErrors.address}
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
