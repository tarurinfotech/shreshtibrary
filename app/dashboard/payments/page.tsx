"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Plus, RotateCcw, AlertTriangle } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PromptDialog } from "@/components/ui/Dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { FilterBar, FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MetricTile } from "@/components/ui/MetricTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints, type PaymentPayload } from "@/lib/endpoints";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { PaymentRecord } from "@/types/api";

const emptyPayment: PaymentPayload = {
  student_id: 0,
  plan_id: undefined,
  duration_type: "1_month",
  duration_days: 30,
  payment_mode: "Cash",
  transaction_ref: "",
  notes: "",
};

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PaymentPayload>(emptyPayment);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [refundTarget, setRefundTarget] = useState<PaymentRecord | null>(null);

  const [page, setPage] = useState(1);

  // Reset page when search or status filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // ── Data queries ──────────────────────────────────────────────────────────
  const payments = useQuery({
    queryKey: ["payments", statusFilter, search, page],
    queryFn: () => endpoints.payments({ status: statusFilter || undefined, search: search || undefined, page, page_size: 15 }),
  });
  const summary = useQuery({ queryKey: ["payment-summary"], queryFn: endpoints.paymentSummary });
  const pending = useQuery({ queryKey: ["pending-payments"], queryFn: endpoints.pendingPayments });
  const overdue = useQuery({ queryKey: ["overdue-payments"], queryFn: endpoints.overduePayments });
  const plans = useQuery({ queryKey: ["public-plans"], queryFn: endpoints.publicPlans });

  // Student dropdown — load all students once
  const students = useQuery({
    queryKey: ["payment-student-options"],
    queryFn: () => endpoints.allStudents({ page_size: 200 }),
  });

  // Membership dropdown — only fetched after a student is selected
  const membershipQuery = useQuery({
    queryKey: ["payment-membership-options", form.student_id],
    queryFn: () => endpoints.studentMemberships(form.student_id),
    enabled: Boolean(form.student_id && form.student_id > 0),
  });

  const hasActivePlan = useMemo(() => {
    return membershipQuery.data?.data?.some((m) => {
      const isStatusActive = m.status === "active" || m.status === "LIVE";
      const isNotExpired = new Date(m.end_date) >= new Date(new Date().setHours(0,0,0,0));
      return isStatusActive && isNotExpired;
    }) ?? false;
  }, [membershipQuery.data]);

  // ── Invalidation ──────────────────────────────────────────────────────────
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["payments"] });
    await queryClient.invalidateQueries({ queryKey: ["payment-summary"] });
    await queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
    await queryClient.invalidateQueries({ queryKey: ["overdue-payments"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: () => endpoints.createPayment(form),
    onSuccess: async () => {
      await invalidate();
      setForm(emptyPayment);
      setOpen(false);
      pushToast({ kind: "success", title: "Payment recorded" });
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Create failed", message: getErrorMessage(error) });
    },
  });

  const verify = useMutation({
    mutationFn: (id: number) => endpoints.verifyPayment(id),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Payment verified" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Verification failed", message: getErrorMessage(error) }),
  });

  const refund = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      endpoints.refundPayment(id, { refund_reason: reason }),
    onSuccess: async () => {
      await invalidate();
      setRefundTarget(null);
      pushToast({ kind: "success", title: "Payment refunded" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Refund failed", message: getErrorMessage(error) }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filtered = payments.data?.data ?? [];

  const handleStudentChange = (v: string) => {
    setForm((cur) => ({
      ...cur,
      student_id: Number(v),
      plan_id: undefined,
      duration_type: "1_month",
      duration_days: 30,
    }));
  };

  const handlePlanChange = (v: string) => {
    setForm((cur) => ({ ...cur, plan_id: Number(v) }));
  };

  const handleDurationTypeChange = (v: string) => {
    let days = 30;
    if (v === "2_months") days = 60;
    if (v === "3_months") days = 90;
    if (v === "custom") days = Math.max(30, form.duration_days ?? 30);
    setForm((cur) => ({ ...cur, duration_type: v as any, duration_days: days }));
  };

  const calculatedAmount = useMemo(() => {
    if (!form.plan_id || !form.duration_days || !plans.data) return "0.00";
    const plan = plans.data.find((p) => String(p.id) === String(form.plan_id));
    if (!plan) return "0.00";
    const baseDuration = Number(plan.duration_days || 30);
    const pricePerDay = Number(plan.price) / baseDuration;
    return (pricePerDay * Number(form.duration_days)).toFixed(2);
  }, [form.plan_id, form.duration_days, plans.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    create.mutate();
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const paymentColumns: Array<DataTableColumn<PaymentRecord>> = [
    {
      id: "student",
      header: "Student",
      cell: (payment) => (
        <>
          <div className="font-medium">{payment.student_name}</div>
          <div className="text-xs text-muted">{payment.payment_id ?? payment.transaction_ref ?? "No reference"}</div>
        </>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      cell: (payment) => (
        <>
          <div>{payment.plan_name ?? "—"}</div>
          <div className="text-xs text-muted">{payment.method ?? payment.payment_mode}</div>
        </>
      ),
    },
    { id: "amount", header: "Amount", cell: (payment) => formatMoney(payment.amount) },
    {
      id: "status",
      header: "Status",
      cell: (payment) => <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>,
    },
    { id: "date", header: "Date", cell: (payment) => formatDate(payment.payment_date) },
    {
      id: "actions",
      header: "Actions",
      cell: (payment) => (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="success"
            size="sm"
            loading={verify.isPending}
            disabled={payment.status.toLowerCase() !== "pending"}
            icon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => verify.mutate(payment.id)}
          >
            Verify
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={() => endpoints.downloadReceipt(payment.id)}
          >
            Receipt
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={refund.isPending}
            disabled={payment.status.toLowerCase() === "refunded"}
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => setRefundTarget(payment)}
          >
            Refund
          </Button>
        </div>
      ),
    },
  ];

  // ── Membership dropdown options ───────────────────────────────────────────
  const membershipOptions = useMemo(() => {
    const base = [{ value: "", label: "None (standalone payment)" }];
    if (!membershipQuery.data?.data?.length) return base;
    return [
      ...base,
      ...membershipQuery.data.data.map((m) => ({
        value: String(m.id),
        label: `${m.plan_name} · ${m.status} · ${formatDate(m.start_date)} → ${formatDate(m.end_date)}`,
      })),
    ];
  }, [membershipQuery.data]);

  return (
    <>
      <PageHeader
        title="Payments"
        eyebrow="Verification"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Record Payment
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Today" value={formatMoney(summary.data?.today_amount)} size="sm" />
        <MetricTile label="All Time" value={formatMoney(summary.data?.all_time_amount)} size="sm" tone="violet" />
        <MetricTile label="This Month" value={formatMoney(summary.data?.month_amount)} size="sm" tone="green" />
        <MetricTile label="Pending" value={pending.data?.length ?? summary.data?.pending_count ?? 0} size="sm" tone="amber" />
        <MetricTile label="Overdue" value={overdue.data?.length ?? 0} size="sm" tone="red" />
      </div>

      <FilterBar className="md:grid-cols-[1fr_220px] md:grid-flow-row">
        <Input
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Student, plan, receipt, transaction"
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "verified", label: "Verified" },
            { value: "refunded", label: "Refunded" },
            { value: "failed", label: "Failed" },
          ]}
        />
      </FilterBar>

      <DataTable
        data={filtered}
        columns={paymentColumns}
        getRowKey={(payment) => payment.id}
        loading={payments.isLoading}
        error={payments.error ? "Unable to load payments." : false}
        emptyTitle="No payments found"
        rowClassName="table-row-hover"
        pagination={
          payments.data
            ? {
                currentPage: payments.data.current_page ?? page,
                totalPages: payments.data.total_pages ?? 1,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* ── Record Payment Modal ── */}
      <Modal open={open} title="Record Payment" onClose={() => { setOpen(false); setForm(emptyPayment); setFieldErrors({}); }}>
        <FormShell onSubmit={submit}>
          {hasActivePlan && (
            <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm font-medium col-span-full">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>This student already has an active subscription. Creating this payment will assign an additional plan.</span>
            </div>
          )}
          <FormGrid columns={2}>
            {/* Student — required */}
            <Select
              className="md:col-span-2"
              label="Student"
              value={String(form.student_id || "")}
              onChange={handleStudentChange}
              error={fieldErrors.student_id}
              required
              searchable
              options={[
                { value: "", label: "Select student" },
                ...(students.data ?? []).map((student) => {
                  const namePart = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
                  const name = namePart || fullName(student.first_name, student.last_name, student.username);
                  return {
                    value: String(student.user_id),
                    label: `${name}${student.student_id ? ` (${student.student_id})` : ""}${student.mobile ? ` · ${student.mobile}` : ""}`,
                    avatarSrc: student.profile_photo || student.profile_image,
                    avatarFallback: name,
                  };
                }),
              ]}
            />

            {/* Duration Type */}
            <Select
              label="Duration"
              value={form.duration_type || "1_month"}
              onChange={handleDurationTypeChange}
              error={fieldErrors.duration_type}
              options={[
                { value: "1_month", label: "1 Month" },
                { value: "2_months", label: "2 Months" },
                { value: "3_months", label: "3 Months" },
                { value: "custom", label: "Custom Duration" },
              ]}
            />

            {/* Plan */}
            <Select
              label="Plan"
              value={String(form.plan_id || "")}
              onChange={handlePlanChange}
              error={fieldErrors.plan_id}
              required
              options={[
                { value: "", label: "Select a plan" },
                ...(plans.data ?? []).map((p) => ({ value: String(p.id), label: `${p.name} (${formatMoney(p.price)})` })),
              ]}
            />

            {/* Custom Days */}
            {form.duration_type === "custom" && (
              <Input
                className="md:col-span-2"
                label="Days (Min 30)"
                type="number"
                min={30}
                value={form.duration_days}
                onChange={(e) => setForm((cur) => ({ ...cur, duration_days: Number(e.target.value) }))}
                error={fieldErrors.duration_days}
                required
              />
            )}

            {/* Calculated Amount */}
            <div className="col-span-full mb-2 p-3 bg-panel border border-border rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">Calculated Amount</span>
              <span className="text-lg font-bold text-primary">{formatMoney(calculatedAmount)}</span>
            </div>

            {/* Payment Mode */}
            <Select
              label="Payment Mode"
              value={form.payment_mode ?? "Cash"}
              onChange={(v) => setForm((cur) => ({ ...cur, payment_mode: v }))}
              error={fieldErrors.payment_mode}
              options={[
                { value: "Cash", label: "Cash" },
                { value: "UPI", label: "UPI" },
                { value: "Card", label: "Card" },
                { value: "Bank Transfer", label: "Bank Transfer" },
              ]}
            />

            {/* Transaction reference */}
            <Input
              label="Transaction Ref"
              value={form.transaction_ref ?? ""}
              onChange={(event) => setForm((cur) => ({ ...cur, transaction_ref: event.target.value }))}
              error={fieldErrors.transaction_ref}
            />

            {/* Notes */}
            <Input
              label="Notes"
              value={form.notes ?? ""}
              onChange={(event) => setForm((cur) => ({ ...cur, notes: event.target.value }))}
              error={fieldErrors.notes}
            />
          </FormGrid>

          <FormActions>
            <Button type="submit" loading={create.isPending} icon={<Plus className="h-4 w-4" />}>
              Save Payment
            </Button>
          </FormActions>
        </FormShell>
      </Modal>

      {/* ── Refund Dialog ── */}
      <PromptDialog
        open={Boolean(refundTarget)}
        title="Refund Payment"
        message={refundTarget ? `Provide a refund reason for ${refundTarget.student_name}.` : undefined}
        label="Refund Reason"
        confirmLabel="Refund"
        loading={refund.isPending}
        onClose={() => setRefundTarget(null)}
        onConfirm={(reason) => refundTarget && refund.mutate({ id: refundTarget.id, reason })}
      />
    </>
  );
}
