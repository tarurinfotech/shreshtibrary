"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Plus, RotateCcw } from "lucide-react";
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
import { getErrorMessage } from "@/lib/api";
import { endpoints, type PaymentPayload } from "@/lib/endpoints";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { PaymentRecord } from "@/types/api";

const emptyPayment: PaymentPayload = {
  student_id: 0,
  membership_id: undefined,
  amount: "",
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
  const [refundTarget, setRefundTarget] = useState<PaymentRecord | null>(null);

  // ── Data queries ──────────────────────────────────────────────────────────
  const payments = useQuery({
    queryKey: ["payments", statusFilter],
    queryFn: () => endpoints.payments({ status: statusFilter || undefined, page_size: 80 }),
  });
  const summary = useQuery({ queryKey: ["payment-summary"], queryFn: endpoints.paymentSummary });
  const pending = useQuery({ queryKey: ["pending-payments"], queryFn: endpoints.pendingPayments });
  const overdue = useQuery({ queryKey: ["overdue-payments"], queryFn: endpoints.overduePayments });

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

  // ── Invalidation ──────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["payment-summary"] });
    queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
    queryClient.invalidateQueries({ queryKey: ["overdue-payments"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: () => endpoints.createPayment(form),
    onSuccess: () => {
      invalidate();
      setForm(emptyPayment);
      setOpen(false);
      pushToast({ kind: "success", title: "Payment recorded" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Create failed", message: getErrorMessage(error) }),
  });

  const verify = useMutation({
    mutationFn: (id: number) => endpoints.verifyPayment(id),
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Payment verified" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Verification failed", message: getErrorMessage(error) }),
  });

  const refund = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      endpoints.refundPayment(id, { refund_reason: reason }),
    onSuccess: () => {
      invalidate();
      setRefundTarget(null);
      pushToast({ kind: "success", title: "Payment refunded" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Refund failed", message: getErrorMessage(error) }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (payments.data?.data ?? []).filter(
      (payment) =>
        !term ||
        [payment.student_name, payment.plan_name, payment.transaction_id, payment.transaction_ref, payment.payment_mode, payment.payment_id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
    );
  }, [payments.data, search]);

  const handleStudentChange = (v: string) => {
    setForm((cur) => ({
      ...cur,
      student_id: Number(v),
      membership_id: undefined, // reset membership when student changes
    }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Today" value={formatMoney(summary.data?.today_amount)} size="sm" />
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
      />

      {/* ── Record Payment Modal ── */}
      <Modal open={open} title="Record Payment" onClose={() => { setOpen(false); setForm(emptyPayment); }}>
        <FormShell onSubmit={submit}>
          <FormGrid columns={2}>
            {/* Student — required */}
            <Select
              label="Student"
              value={String(form.student_id || "")}
              onChange={handleStudentChange}
              required
              searchable
              options={[
                { value: "", label: "Select student" },
                ...(students.data ?? []).map((student) => {
                  const name =
                    [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") ||
                    fullName(student.first_name, student.last_name) ||
                    student.username;
                  return {
                    value: String(student.user_id),
                    label: `${name}${student.student_id ? ` (${student.student_id})` : ""}${student.mobile ? ` · ${student.mobile}` : ""}`,
                    avatarSrc: student.profile_photo || student.profile_image,
                    avatarFallback: name,
                  };
                }),
              ]}
            />

            {/* Membership — dynamic dropdown, only active after student selected */}
            <Select
              label={membershipQuery.isFetching ? "Membership (loading…)" : "Membership"}
              value={String(form.membership_id ?? "")}
              onChange={(v) => setForm((cur) => ({ ...cur, membership_id: v ? Number(v) : undefined }))}
              options={membershipOptions}
            />

            {/* Amount */}
            <Input
              label="Amount"
              type="number"
              min={0.01}
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((cur) => ({ ...cur, amount: event.target.value }))}
              required
            />

            {/* Payment Mode */}
            <Select
              label="Payment Mode"
              value={form.payment_mode ?? "Cash"}
              onChange={(v) => setForm((cur) => ({ ...cur, payment_mode: v }))}
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
            />

            {/* Notes */}
            <Input
              label="Notes"
              value={form.notes ?? ""}
              onChange={(event) => setForm((cur) => ({ ...cur, notes: event.target.value }))}
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
