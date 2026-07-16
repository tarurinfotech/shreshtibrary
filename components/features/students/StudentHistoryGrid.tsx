import { useQuery } from "@tanstack/react-query";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatMoney } from "@/lib/format";

export function StudentHistoryGrid({ studentId }: { studentId: string }) {
  const timeline = useQuery({ queryKey: ["student-timeline", studentId], queryFn: () => endpoints.studentTimeline(studentId) });
  const payments = useQuery({ queryKey: ["student-payments", studentId], queryFn: () => endpoints.studentPayments(studentId) });

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <section className="surface rounded-lg p-5">
        <h2 className="mb-4 font-semibold">Timeline</h2>
        <div className="grid gap-3">
          {(timeline.data ?? []).slice(0, 8).map((item: any) => (
            <div key={item.id} className="rounded-lg border border-border bg-panel-strong p-3">
              <p className="text-sm font-medium">{item.action}</p>
              <p className="mt-1 text-xs text-muted">{item.description || formatDate(item.created_at)}</p>
            </div>
          ))}
          {timeline.isSuccess && timeline.data?.length === 0 && (
            <p className="text-sm text-muted">No timeline events found.</p>
          )}
          {timeline.isLoading && <p className="text-sm text-muted">Loading timeline...</p>}
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
              {(payments.data ?? []).slice(0, 8).map((payment: any) => {
                const isRefunded = payment.status.toLowerCase() === 'refunded';
                return (
                  <tr key={payment.id}>
                    <Td>{payment.plan_name}</Td>
                    <Td>
                      <span className={isRefunded ? "line-through text-muted" : "font-semibold"}>
                        {formatMoney(payment.amount)}
                      </span>
                    </Td>
                    <Td><Badge variant={statusVariant(payment.status)}>{payment.status}</Badge></Td>
                    <Td>{formatDate(payment.payment_date)}</Td>
                  </tr>
                );
              })}
              {payments.isSuccess && payments.data?.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-muted text-sm border-b border-border">No payments found.</td>
                </tr>
              )}
              {payments.isLoading && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-muted text-sm border-b border-border">Loading payments...</td>
                </tr>
              )}
            </tbody>
          </Table>
        </TableShell>
      </section>
    </div>
  );
}
