import { useQuery } from "@tanstack/react-query";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { endpoints } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";

export function StudentRecentAttendance({ studentId }: { studentId: string }) {
  const attendance = useQuery({ queryKey: ["student-attendance", studentId], queryFn: () => endpoints.studentAttendance(studentId) });

  return (
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
            {(attendance.data ?? []).slice(0, 12).map((record: any) => (
              <tr key={record.id}>
                <Td>{formatDate(record.date)}</Td>
                <Td>{record.time_in ?? "Not set"}</Td>
                <Td>{record.method}</Td>
                <Td>
                  <Badge variant={
                    record.status === 'Pending' ? 'warning' :
                      record.status === 'Absent' ? 'danger' :
                        record.status === 'Arrived Late' ? 'warning' : 'success'
                  }>
                    {record.status ?? (record.is_present ? "Present" : "Absent")}
                  </Badge>
                </Td>
              </tr>
            ))}
            {attendance.isSuccess && attendance.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-muted text-sm border-b border-border">No attendance records found.</td>
              </tr>
            )}
            {attendance.isLoading && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-muted text-sm border-b border-border">Loading attendance...</td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableShell>
    </section>
  );
}
