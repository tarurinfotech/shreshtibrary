"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Eye, Plus, Power, Save } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlanCard } from "@/components/ui/PlanCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EntityListItem } from "@/components/ui/EntityListItem";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DateInput } from "@/components/ui/DateInput";;
import { MetricTile } from "@/components/ui/MetricTile";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage } from "@/lib/api";
import { endpoints, type MembershipPayload, type PlanUpdatePayload } from "@/lib/endpoints";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { MembershipPlan, MembershipRecord } from "@/types/api";

const emptyPlan: PlanUpdatePayload = {
  name: "",
  duration_months: 1,
  duration_days: 30,
  price: "0",
  benefits: [],
  description: "",
  is_active: true,
  sort_order: 0,
};

const emptyMembership: MembershipPayload = {
  student_id: 0,
  plan_id: 0,
  start_date: "",
  end_date: "",
  notes: "",
};

export default function MembershipsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [tab, setTab] = useState<"plans" | "memberships">("plans");
  const [selected, setSelected] = useState<MembershipPlan | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState<PlanUpdatePayload>(emptyPlan);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [membershipMode, setMembershipMode] = useState<"assign" | "renew" | "upgrade">("assign");
  const [membershipForm, setMembershipForm] = useState<MembershipPayload>(emptyMembership);
  const [studentPlanId, setStudentPlanId] = useState<number | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key) || currentUser.permissions.includes("all");
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };

  const canManagePlans = hasPerm("Membership.ManagePlans");
  const canAssign = hasPerm("Membership.Create");
  const canRenew = hasPerm("Membership.Renew");
  const canUpgrade = hasPerm("Membership.Edit");

  const plans = useQuery({ queryKey: ["plans"], queryFn: endpoints.plans });
  const planStats = useQuery({ queryKey: ["plan-stats"], queryFn: endpoints.planStats });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => endpoints.memberships({ page_size: 80 }) });
  const expiring = useQuery({ queryKey: ["memberships-expiring"], queryFn: () => endpoints.expiringMemberships(7) });
  const expiredToday = useQuery({ queryKey: ["memberships-expired-today"], queryFn: endpoints.expiredTodayMemberships });
  const planStudents = useQuery({
    queryKey: ["plan-students", studentPlanId],
    queryFn: () => endpoints.planStudents(studentPlanId ?? 0),
    enabled: Boolean(studentPlanId),
  });
  const students = useQuery({
    queryKey: ["all-students-options"],
    queryFn: () => endpoints.allStudents({ page_size: 200 }),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["plans"] });
    await queryClient.invalidateQueries({ queryKey: ["plan-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    await queryClient.invalidateQueries({ queryKey: ["memberships-expiring"] });
    await queryClient.invalidateQueries({ queryKey: ["memberships-expired-today"] });
  };

  const savePlan = useMutation({
    mutationFn: () => selected ? endpoints.updatePlan(selected.id, planForm) : endpoints.createPlan(planForm),
    onSuccess: async () => {
      await invalidate();
      setPlanOpen(false);
      setSelected(null);
      setPlanForm(emptyPlan);
      pushToast({ kind: "success", title: "Plan saved" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Plan save failed", message: getErrorMessage(error) }),
  });

  const togglePlan = useMutation({
    mutationFn: (plan: MembershipPlan) => endpoints.togglePlan(plan.id, !plan.is_active),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Plan updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Toggle failed", message: getErrorMessage(error) }),
  });

  const saveMembership = useMutation({
    mutationFn: () => {
      if (membershipMode === "renew") return endpoints.renewMembership(membershipForm);
      if (membershipMode === "upgrade") return endpoints.upgradeMembership(membershipForm);
      return endpoints.assignMembership(membershipForm);
    },
    onSuccess: async () => {
      await invalidate();
      setMembershipOpen(false);
      setMembershipForm(emptyMembership);
      pushToast({ kind: "success", title: "Membership saved" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Membership failed", message: getErrorMessage(error) }),
  });

  const openPlan = (plan?: MembershipPlan) => {
    setSelected(plan ?? null);
    setPlanForm(plan ? {
      name: plan.name,
      duration_months: plan.duration_months,
      duration_days: plan.duration_days,
      price: String(plan.price),
      benefits: Array.isArray(plan.benefits) ? plan.benefits : (typeof plan.benefits === 'string' && plan.benefits ? (plan.benefits as string).split(',').map(s => s.trim()).filter(Boolean) : []),
      description: plan.description,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    } : emptyPlan);
    setPlanOpen(true);
  };

  const openMembership = (mode: "assign" | "renew" | "upgrade") => {
    setMembershipMode(mode);
    setMembershipOpen(true);
  };

  const submitPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    savePlan.mutate();
  };

  const submitMembership = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMembership.mutate();
  };
  const membershipColumns: Array<DataTableColumn<MembershipRecord>> = [
    { id: "student", header: "Student", cell: (membership) => membership.student_name },
    {
      id: "plan",
      header: "Plan",
      cell: (membership) => (
        <>
          <div>{membership.plan_name}</div>
          <div className="text-xs text-muted">{formatMoney(membership.price_snapshot)}</div>
        </>
      ),
    },
    { id: "dates", header: "Dates", cell: (membership) => `${formatDate(membership.start_date)} - ${formatDate(membership.end_date)}` },
    { id: "status", header: "Status", cell: (membership) => <Badge variant={statusVariant(membership.status)}>{membership.status}</Badge> },
    { id: "renewals", header: "Renewals", cell: (membership) => membership.renewal_count },
  ];

  return (
    <>
      <PageHeader
        title="Memberships"
        eyebrow="Plans and Students"
        actions={
          tab === "plans" ? (
            canManagePlans && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => openPlan()}>
                Add Plan
              </Button>
            )
          ) : (
            canAssign && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => openMembership("assign")}>
                Assign Plan
              </Button>
            )
          )
        }
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "plans", label: "Plans" },
          { value: "memberships", label: "Student Memberships" },
        ]}
      />

      {tab === "plans" ? (
        <>
          {plans.isLoading ? <LoadingBlock label="Loading plans" /> : null}
          {plans.error ? <ErrorState message="Unable to load membership plans." /> : null}
          {!plans.isLoading && !plans.error && (plans.data ?? []).length === 0 ? <EmptyState title="No plans found" /> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(Array.isArray(plans.data) ? plans.data : []).map((plan) => {
              const stats = Array.isArray(planStats.data) ? planStats.data.find((item) => item.id === plan.id) : null;
              return (
                <PlanCard
                  key={plan.id}
                  title={plan.name}
                  duration={`${plan.duration_days} days`}
                  isActive={plan.is_active}
                  price={formatMoney(plan.price)}
                  description={plan.description || "No description"}
                  stats={
                    <>
                      <span>{stats?.active_students ?? 0} active</span>
                      <span>{stats?.all_time_students ?? 0} all time</span>
                    </>
                  }
                  actions={
                    <>
                      {canManagePlans && (
                        <>
                          <Button variant="secondary" size="sm" icon={<Edit3 className="h-4 w-4" />} onClick={() => openPlan(plan)}>Edit</Button>
                          <Button variant="secondary" size="sm" icon={<Power className="h-4 w-4" />} loading={togglePlan.isPending} onClick={() => togglePlan.mutate(plan)}>Toggle</Button>
                        </>
                      )}
                      <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => setStudentPlanId(plan.id)}>Students</Button>
                    </>
                  }
                />
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricTile label="Active Records" value={memberships.data?.count ?? 0} />
            <MetricTile label="Expiring 7 Days" value={expiring.data?.length ?? 0} tone="amber" />
            <MetricTile label="Expired Today" value={expiredToday.data?.length ?? 0} tone="red" />
          </div>
          <div className="flex flex-wrap gap-2">
            {canAssign && <Button variant="secondary" onClick={() => openMembership("assign")}>Assign</Button>}
            {canRenew && <Button variant="secondary" onClick={() => openMembership("renew")}>Renew</Button>}
            {canUpgrade && <Button variant="secondary" onClick={() => openMembership("upgrade")}>Upgrade</Button>}
          </div>
          <DataTable
            data={memberships.data?.data ?? []}
            columns={membershipColumns}
            getRowKey={(membership) => membership.id}
            loading={memberships.isLoading}
            error={memberships.error ? "Unable to load memberships." : false}
            emptyTitle="No memberships found"
          />
        </>
      )}

      <Modal open={planOpen} title={selected ? "Edit Plan" : "Add Plan"} onClose={() => setPlanOpen(false)}>
        <FormShell onSubmit={submitPlan} noValidate>
          <Input label="Name" value={planForm.name ?? ""} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} required />
          <FormGrid columns={2}>
            <Input label="Duration Months" type="number" min={1} value={planForm.duration_months ?? 1} onChange={(event) => setPlanForm((current) => ({ ...current, duration_months: Number(event.target.value), duration_days: Number(event.target.value) * 30 }))} required />
            <Input label="Duration Days" type="number" min={1} value={planForm.duration_days ?? 30} onChange={(event) => setPlanForm((current) => ({ ...current, duration_days: Number(event.target.value) }))} required />
            <Input label="Price" type="number" min={0} step="0.01" value={planForm.price ?? ""} onChange={(event) => setPlanForm((current) => ({ ...current, price: event.target.value ? String(event.target.value) : "0" }))} required />
            <Input label="Sort Order" type="number" value={planForm.sort_order ?? 0} onChange={(event) => setPlanForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
          </FormGrid>
          <Textarea label="Description" value={planForm.description ?? ""} onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))} />
          <Input label="Benefits" helper="Comma separated" value={(planForm.benefits ?? []).join(", ")} onChange={(event) => setPlanForm((current) => ({ ...current, benefits: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
          <Select
            label="Status"
            value={planForm.is_active ? "active" : "inactive"}
            onChange={(v) => setPlanForm((current) => ({ ...current, is_active: v === "active" }))}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <FormActions>
            <Button type="submit" loading={savePlan.isPending} icon={<Save className="h-4 w-4" />}>Save Plan</Button>
          </FormActions>
        </FormShell>
      </Modal>

      <Modal open={membershipOpen} title={`${membershipMode} Membership`} onClose={() => setMembershipOpen(false)}>
        <FormShell onSubmit={submitMembership} noValidate>
          <FormGrid columns={2}>
            <Select
              label="Student"
              value={String(membershipForm.student_id || "")}
              onChange={(v) => setMembershipForm((current) => ({ ...current, student_id: Number(v) }))}
              searchable
              required
              options={[
                { value: "", label: "Select student" },
                ...(students.data ?? []).map((student) => {
                  const name = fullName(student.first_name, student.last_name, student.username);
                  return {
                    value: String(student.user_id),
                    label: `${name}${student.student_id ? ` (${student.student_id})` : ""}${student.mobile ? ` · ${student.mobile}` : ""}`,
                    avatarSrc: student.profile_photo || student.profile_image,
                    avatarFallback: name,
                  };
                }),
              ]}
            />
            <Select
              label="Plan"
              value={String(membershipForm.plan_id || "")}
              onChange={(v) => setMembershipForm((current) => ({ ...current, plan_id: Number(v) }))}
              required
              options={[
                { value: "", label: "Select plan" },
                ...(plans.data ?? []).map((plan) => ({ value: String(plan.id), label: plan.name })),
              ]}
            />
            <DateInput label="Start Date" value={membershipForm.start_date ?? ""} onChange={(event) => setMembershipForm((current) => ({ ...current, start_date: event.target.value }))} />
            <DateInput label="End Date" value={membershipForm.end_date ?? ""} onChange={(event) => setMembershipForm((current) => ({ ...current, end_date: event.target.value }))} />
          </FormGrid>
          <Textarea label="Notes" value={membershipForm.notes ?? ""} onChange={(event) => setMembershipForm((current) => ({ ...current, notes: event.target.value }))} />
          <FormActions>
            <Button type="submit" loading={saveMembership.isPending} icon={<Save className="h-4 w-4" />}>Save Membership</Button>
          </FormActions>
        </FormShell>
      </Modal>

      <Modal open={Boolean(studentPlanId)} title="Plan Students" onClose={() => setStudentPlanId(null)}>
        <div className="grid gap-3">
          {planStudents.isLoading ? <LoadingBlock label="Loading students" /> : null}
          {(planStudents.data ?? []).map((student, index) => (
            <EntityListItem
              key={student.id ?? student.user_id ?? student.student_id ?? index}
              title={fullName(student.first_name, student.last_name, student.username)}
              trailing={<Badge variant={statusVariant(student.status)}>{student.status}</Badge>}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}
