"use client";

import { useState, useMemo, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Calendar, Plus, CreditCard } from "lucide-react";

import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { FormShell, FormGrid, FormActions } from "@/components/ui/Form";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints, type PaymentPayload } from "@/lib/endpoints";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";

const emptyPayment: PaymentPayload = {
  student_id: 0,
  plan_id: undefined,
  duration_type: "1_month",
  duration_days: 30,
  payment_mode: "Cash",
  transaction_ref: "",
  notes: "",
};

export function StudentPlanDetails({ studentId, canAssignPlan, userId }: { studentId: string; canAssignPlan: boolean; userId?: number }) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [form, setForm] = useState<PaymentPayload>(emptyPayment);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const memberships = useQuery({ queryKey: ["student-memberships", studentId], queryFn: () => endpoints.studentMemberships(Number(studentId)) });
  const allPlans = useQuery({ queryKey: ["admin-plans"], queryFn: () => endpoints.plans() });
  const students = useQuery({ queryKey: ["payment-student-options"], queryFn: () => endpoints.allStudents({ page_size: 200 }) });

  const targetStudentId = userId ?? Number(studentId);

  const openPaymentModalForPlan = (planId: number) => {
    const plan = (allPlans.data ?? []).find((p: any) => p.id === planId);
    const durationDays = plan?.duration_days ? Number(plan.duration_days) : (plan?.duration_months ? plan.duration_months * 30 : 30);

    setForm({
      student_id: targetStudentId,
      plan_id: planId,
      duration_type: "1_month",
      duration_days: durationDays,
      payment_mode: "Cash",
      transaction_ref: "",
      notes: "",
    });
    setFieldErrors({});
    setPaymentModalOpen(true);
  };

  const handleStudentChange = (v: string) => {
    setForm((cur) => ({
      ...cur,
      student_id: Number(v),
    }));
  };

  const handlePlanChange = (v: string) => {
    const selectedPlanId = Number(v);
    const plan = (allPlans.data ?? []).find((p: any) => p.id === selectedPlanId);
    const durationDays = plan?.duration_days ? Number(plan.duration_days) : (plan?.duration_months ? plan.duration_months * 30 : 30);

    setForm((cur) => ({
      ...cur,
      plan_id: selectedPlanId,
      duration_days: durationDays,
    }));
  };

  const handleDurationTypeChange = (v: string) => {
    let days = 30;
    if (v === "2_months") days = 60;
    if (v === "3_months") days = 90;
    if (v === "custom") days = Math.max(30, form.duration_days ?? 30);
    setForm((cur) => ({ ...cur, duration_type: v as any, duration_days: days }));
  };

  const calculatedAmount = useMemo(() => {
    if (!form.plan_id || !form.duration_days || !allPlans.data) return "0.00";
    const plan = allPlans.data.find((p: any) => String(p.id) === String(form.plan_id));
    if (!plan) return "0.00";
    const baseDuration = Number(plan.duration_days || (plan.duration_months ? plan.duration_months * 30 : 30));
    const pricePerDay = Number(plan.price) / baseDuration;
    return (pricePerDay * Number(form.duration_days)).toFixed(2);
  }, [form.plan_id, form.duration_days, allPlans.data]);

  const createPayment = useMutation({
    mutationFn: () => endpoints.createPayment(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student-memberships", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["student-payments", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPaymentModalOpen(false);
      setForm(emptyPayment);
      pushToast({ kind: "success", title: "Payment recorded successfully" });
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Payment failed", message: getErrorMessage(error) });
    },
  });

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    createPayment.mutate();
  };

  return (
    <>
      <section className="surface rounded-lg p-5">
        <h2 className="mb-4 font-semibold">Plan Details</h2>
        
        {(() => {
          const activePlans = (memberships.data?.data ?? []).filter((m: any) => m.status.toLowerCase() === 'active');
          if (activePlans.length > 0) {
            const active = activePlans[0];
            return (
              <div className="mb-6 rounded-xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{active.plan_name}</h3>
                    <div className="mt-2 flex items-center gap-2 text-primary-foreground/90">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(active.start_date)} — {formatDate(active.end_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">ACTIVE</span>
                  </div>
                </div>
              </div>
            );
          } else {
            return (
              <div className="mb-6">
                <p className="mb-4 text-sm text-muted">No active plan found. Select a plan below to assign for payment.</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(allPlans.data ?? []).filter((p: any) => p.is_active !== false).map((plan: any) => (
                    <div key={plan.id} className="flex flex-col justify-between rounded-xl border border-border bg-panel-strong p-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{plan.name}</h4>
                        <p className="mt-1 text-xs text-muted">{plan.duration_months} Months</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-bold">{formatMoney(plan.price)}</span>
                        <Button 
                          size="sm" 
                          icon={<CreditCard className="h-4 w-4" />}
                          disabled={!canAssignPlan}
                          onClick={() => openPaymentModalForPlan(plan.id)}
                          title={!canAssignPlan ? "You do not have permission to assign plans" : undefined}
                        >
                          Buy / Assign
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        })()}

        <h3 className="mb-3 mt-6 font-semibold text-sm text-muted">Membership History</h3>
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
              {(memberships.data?.data ?? []).map((membership: any) => (
                <tr key={membership.id}>
                  <Td className="font-medium">{membership.plan_name}</Td>
                  <Td><Badge variant={statusVariant(membership.status)}>{membership.status}</Badge></Td>
                  <Td>{formatDate(membership.start_date)}</Td>
                  <Td>{formatDate(membership.end_date)}</Td>
                </tr>
              ))}
              {memberships.isSuccess && memberships.data?.data?.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-muted text-sm border-b border-border">No historical plans found for this student.</td>
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

      {/* Record Payment Modal directly on Student Detail page */}
      <Modal open={paymentModalOpen} title="Record Payment" onClose={() => setPaymentModalOpen(false)}>
        <FormShell onSubmit={submitPayment}>
          <FormGrid columns={2}>
            {/* Student */}
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
                ...(students.data ?? []).map((student: any) => {
                  const namePart = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
                  const name = namePart || fullName(student.first_name, student.last_name, student.username);
                  const targetVal = String(student.user_id ?? student.id);
                  return {
                    value: targetVal,
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
                ...(allPlans.data ?? []).map((p: any) => ({ value: String(p.id), label: `${p.name} (${formatMoney(p.price)})` })),
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

            {/* Transaction Ref */}
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
            <Button type="submit" loading={createPayment.isPending} icon={<Plus className="h-4 w-4" />}>
              Save Payment
            </Button>
          </FormActions>
        </FormShell>
      </Modal>
    </>
  );
}
