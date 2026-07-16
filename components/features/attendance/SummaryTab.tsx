import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/endpoints";
import { getTodayDate } from "@/lib/format"; // Assuming getTodayDate is available or can be exported from format
import { DateInput } from "@/components/ui/DateInput";
import { MetricTile } from "@/components/ui/MetricTile";
import { LoadingBlock, EmptyState } from "@/components/ui/StateBlocks";
import { EntityListItem } from "@/components/ui/EntityListItem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fullName, formatDate } from "@/lib/format";
import { Calendar } from "lucide-react";

export function SummaryTab() {
  const [summaryDate, setSummaryDate] = useState(getTodayDate());
  const [absenteePage, setAbsenteePage] = useState(1);
  const absenteePageSize = 10;
  const [streakPage, setStreakPage] = useState(1);
  const streakPageSize = 10;

  const summary = useQuery({
    queryKey: ["attendance-summary", summaryDate],
    queryFn: () => endpoints.attendanceDailySummary(summaryDate || undefined),
    staleTime: 0,
  });

  const absentees = useQuery({
    queryKey: ["attendance-absentees", summaryDate],
    queryFn: () => endpoints.attendanceAbsentees(summaryDate || undefined),
    staleTime: 0,
  });

  const streak = useQuery({
    queryKey: ["attendance-streak"],
    queryFn: endpoints.attendanceStreak,
  });

  const allHolidays = useQuery({
    queryKey: ["all-holidays"],
    queryFn: () => endpoints.holidays({ is_active: true }),
  });

  return (
    <div id="tabpanel-summary" role="tabpanel" aria-labelledby="tab-summary" className="grid gap-4">
      <div className="max-w-xs">
        <DateInput label="Date" value={summaryDate} onChange={(event) => setSummaryDate(event.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Present" value={summary.data?.present ?? 0} tone="green" />
        <MetricTile label="Pending" value={summary.data?.pending ?? 0} tone="amber" />
        <MetricTile label="Absent" value={summary.data?.absent ?? 0} tone="red" />
        <MetricTile label="Total" value={summary.data?.total ?? 0} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="surface rounded-lg p-5">
          <h2 className="mb-4 font-semibold">Absentees</h2>
          {absentees.isLoading ? <LoadingBlock label="Loading absentees" /> : (
            <div className="grid gap-2">
              {(absentees.data ?? []).slice((absenteePage - 1) * absenteePageSize, absenteePage * absenteePageSize).map((student) => (
                <EntityListItem
                  key={student.user_id}
                  title={fullName(student.first_name, student.last_name, student.username)}
                  trailing={
                    <div className="flex flex-col items-end gap-1">
                      {student.attendance_status === 'pending' ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="danger">Absent</Badge>
                      )}
                      {student.student_id && <span className="text-xs text-muted">ID: {student.student_id}</span>}
                    </div>
                  }
                />
              ))}
              {(absentees.data?.length === 0) && <EmptyState title="No absentees found" />}
              {absentees.data && absentees.data.length > absenteePageSize && (
                <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
                  <Button variant="secondary" size="sm" disabled={absenteePage === 1} onClick={() => setAbsenteePage(p => Math.max(1, p - 1))}>Previous</Button>
                  <span className="text-xs font-medium text-muted">
                    Page {absenteePage} of {Math.ceil(absentees.data.length / absenteePageSize)}
                  </span>
                  <Button variant="secondary" size="sm" disabled={absenteePage >= Math.ceil(absentees.data.length / absenteePageSize)} onClick={() => setAbsenteePage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          )}
        </section>
        <section className="surface rounded-lg p-5">
          <h2 className="mb-4 font-semibold">Streaks</h2>
          {streak.isLoading ? <LoadingBlock label="Loading streaks" /> : (
            <div className="grid gap-2">
              {(streak.data ?? []).slice((streakPage - 1) * streakPageSize, streakPage * streakPageSize).map((item) => (
                <EntityListItem key={item.student.user_id} title={fullName(item.student.first_name, item.student.last_name, item.student.username)} trailing={<Badge variant="info">{item.streak} days</Badge>} />
              ))}
              {(streak.data?.length === 0) && <EmptyState title="No streaks currently active" />}
              {streak.data && streak.data.length > streakPageSize && (
                <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
                  <Button variant="secondary" size="sm" disabled={streakPage === 1} onClick={() => setStreakPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <span className="text-xs font-medium text-muted">
                    Page {streakPage} of {Math.ceil(streak.data.length / streakPageSize)}
                  </span>
                  <Button variant="secondary" size="sm" disabled={streakPage >= Math.ceil(streak.data.length / streakPageSize)} onClick={() => setStreakPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      {/* All Holidays Section */}
      <section className="surface rounded-lg p-5">
        <h2 className="mb-4 font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> All Holidays</h2>
        {allHolidays.isLoading ? <LoadingBlock label="Loading holidays" /> : (
          <div className="grid gap-2">
            {(() => {
              const sorted = [...(allHolidays.data ?? [])].sort((a, b) => a.date.localeCompare(b.date));
              if (sorted.length === 0) return <EmptyState title="No holidays declared" />;
              return sorted.map((holiday) => {
                const isPast = holiday.date < getTodayDate();
                const isToday = holiday.date === getTodayDate();
                return (
                  <EntityListItem
                    key={holiday.id}
                    title={holiday.title}
                    meta={formatDate(holiday.date)}
                    trailing={
                      <Badge variant={isPast ? "neutral" : isToday ? "warning" : "success"}>
                        {isPast ? "Past" : isToday ? "Today" : "Upcoming"}
                      </Badge>
                    }
                  />
                );
              });
            })()}
          </div>
        )}
      </section>
    </div>
  );
}
