"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useDebounce } from "@/lib/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Eye,
  Plus,
  ShieldAlert,
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
  Hourglass,
} from "lucide-react";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Dialog";
import { FilterBar } from "@/components/ui/FilterBar";
import { GradientStatCard } from "@/components/ui/GradientStatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterSelect } from "@/components/ui/Select";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { fullName } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { StudentProfile } from "@/types/api";
import { StudentCreateForm } from "@/components/features/students/StudentCreateForm";

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const currentUser = useAuthStore((state) => state.user);
  
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [goal, setGoal] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<StudentProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentProfile | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedGoal = useDebounce(goal, 400);
  const debouncedStatus = useDebounce(status, 100);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedStatus, debouncedGoal]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const students = useQuery({
    queryKey: ["students", debouncedSearch, debouncedStatus, debouncedGoal, page],
    queryFn: () =>
      endpoints.students({
        search: debouncedSearch || undefined,
        status: debouncedStatus || undefined,
        goal: debouncedGoal || undefined,
        page: page,
        page_size: 20,
      }),
  });
  const counts = useQuery({ queryKey: ["student-counts"], queryFn: endpoints.studentCounts });

  // ── Mutations ─────────────────────────────────────────────────────────────
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

  // ── Data ──────────────────────────────────────────────────────────────────
  const rows = students.data?.data ?? [];
  const genderRows = [
    { label: "Girls", value: counts.data?.girls ?? 0, color: "#f472b6", emoji: "👩" },
    { label: "Boys", value: counts.data?.boys ?? 0, color: "#38bdf8", emoji: "👦" },
    { label: "Other", value: counts.data?.other ?? 0, color: "#a78bfa", emoji: "🌈" },
  ].filter((item) => item.value > 0);
  const genderTotal = genderRows.reduce((sum, item) => sum + item.value, 0);
  const isSuperAdmin = currentUser?.role === "super_admin";

  // ── Columns ───────────────────────────────────────────────────────────────
  const studentColumns: Array<DataTableColumn<StudentProfile>> = [
    {
      id: "student",
      header: "Student",
      cell: (student) => (
        <div className="flex items-center gap-3">
          <ProfileAvatar
            src={student.profile_image ?? student.profile_photo}
            name={[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || student.username}
            size="md"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-foreground">
              {fullName(student.first_name, student.last_name, student.username)}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted">SIR-ID: {student.student_id ?? student.user_id}</div>
          </div>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: (student) => (
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
      ),
    },
    {
      id: "goal",
      header: "Goal",
      cell: (student) => (
        <div className="flex items-center gap-2 text-sm text-foreground/90 min-w-[100px]">
          <Target className="h-4 w-4 text-muted shrink-0" />
          <span className="truncate font-medium">{student.goal || "—"}</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (student) => (
        <div className="min-w-[90px]">
          <Badge variant={statusVariant(student.status)}>{student.status}</Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (student) => {
        const isSuspendPending = suspend.isPending && suspend.variables?.id === student.user_id;
        const isActivatePending = activate.isPending && activate.variables === student.user_id;
        const isDeletePending = remove.isPending && remove.variables === student.user_id;
        
        return (
          <div className="flex items-center justify-end gap-2.5">
            <Link
              href={`/dashboard/students/${student.user_id}`}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-xs font-semibold text-foreground transition-colors hover:bg-hover"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Link>

            {student.status === "SUSPENDED" ? (
              <Button
                variant="success"
                size="sm"
                loading={isActivatePending}
                disabled={isSuspendPending || isDeletePending}
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={() => activate.mutate(student.user_id)}
                className="h-8 rounded-md px-3 text-xs"
              >
                Activate
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                loading={isSuspendPending}
                disabled={isActivatePending || isDeletePending || student.status === "PENDING"}
                icon={<ShieldAlert className="h-3.5 w-3.5" />}
                onClick={() => setSuspendTarget(student)}
                className="h-8 rounded-md px-3 text-xs"
                title={student.status === "PENDING" ? "Cannot suspend a pending student" : "Suspend student"}
              >
                Suspend
              </Button>
            )}

            {isSuperAdmin && (
              <Button
                variant="danger"
                size="sm"
                loading={isDeletePending}
                disabled={isSuspendPending || isActivatePending}
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => setDeleteTarget(student)}
                className="h-8 rounded-md px-3 text-xs"
              >
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Students"
        eyebrow="Profiles"
        description="Manage all student profiles, memberships and status"
        actions={
          <div className="flex items-center gap-3">
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
        }
      />

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
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
          gradient="linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
          loading={counts.isLoading}
        />
        <GradientStatCard
          label="Pending"
          value={counts.data?.pending ?? 0}
          icon={<Hourglass className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          loading={counts.isLoading}
        />
        <GradientStatCard
          label="Expired"
          value={counts.data?.expired ?? 0}
          icon={<Clock className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
          loading={counts.isLoading}
        />
        <GradientStatCard
          label="Suspended"
          value={counts.data?.suspended ?? 0}
          icon={<Ban className="h-5 w-5" />}
          gradient="linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
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

        <FilterSelect
          id="student-status-filter"
          value={status}
          onChange={setStatus}
          placeholder="All Status"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          options={[
            { value: "", label: "All Status" },
            { value: "LIVE", label: "Live" },
            { value: "PENDING", label: "Pending" },
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
      <DataTable
        data={rows}
        columns={studentColumns}
        getRowKey={(student) => student.user_id}
        loading={students.isLoading}
        error={students.error ? "Unable to load students." : false}
        emptyTitle="No students found. Try adjusting your search or filters."
        rowClassName="hover:bg-table-row-hover transition-colors"
        pagination={
          students.data?.total_pages && students.data.total_pages > 1
            ? {
                currentPage: students.data.current_page || page,
                totalPages: students.data.total_pages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
      
      {rows.length > 0 && (
        <div className="mt-4 text-xs text-muted">
          Showing {rows.length} student{rows.length !== 1 ? "s" : ""}
          {search || status || goal ? " (filtered)" : ""}
          {students.data?.count ? ` of ${students.data.count} total` : ""}
        </div>
      )}

      {/* ── Add Student Form ──────────────────────────────────────────────────── */}
      <StudentCreateForm open={open} onClose={() => setOpen(false)} />

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
