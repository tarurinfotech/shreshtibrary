import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Calendar, Plus } from "lucide-react";

import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";

export function StudentPlanDetails({ studentId, canAssignPlan }: { studentId: string; canAssignPlan: boolean }) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const memberships = useQuery({ queryKey: ["student-memberships", studentId], queryFn: () => endpoints.studentMemberships(Number(studentId)) });
  const allPlans = useQuery({ queryKey: ["admin-plans"], queryFn: () => endpoints.plans() });

  const assignPlan = useMutation({
    mutationFn: (planId: number) => endpoints.assignMembership({ student_id: Number(studentId), plan_id: planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-memberships", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-payments", studentId] });
      pushToast({ kind: "success", title: "Plan assigned successfully" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Failed to assign plan", message: getErrorMessage(error) }),
  });

  return (
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
              <p className="mb-4 text-sm text-muted">No active plan found. Select a plan below to assign.</p>
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
                        icon={<Plus className="h-4 w-4" />}
                        loading={assignPlan.isPending}
                        disabled={!canAssignPlan}
                        onClick={() => assignPlan.mutate(plan.id)}
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
  );
}
