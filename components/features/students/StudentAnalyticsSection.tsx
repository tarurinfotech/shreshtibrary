import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock } from "lucide-react";
import { StudentAttendanceCalendar } from "@/components/features/students/StudentAttendanceCalendar";
import { ChartPanel, SharedAreaChart } from "@/components/ui/ChartWidgets";
import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { endpoints } from "@/lib/endpoints";
import type { StudentAnalytics } from "@/types/api";

const periods: Array<{ value: StudentAnalytics["period"]; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function StudentAnalyticsSection({ studentId, joiningDate }: { studentId: string; joiningDate?: string }) {
  const [period, setPeriod] = useState<StudentAnalytics["period"]>("weekly");

  const attendance = useQuery({ queryKey: ["student-attendance", studentId], queryFn: () => endpoints.studentAttendance(studentId) });
  const analytics = useQuery({
    queryKey: ["student-analytics", studentId, period],
    queryFn: () => endpoints.studentAnalytics(studentId, period),
  });

  return (
    <section className="surface rounded-lg p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Student Analytics</h2>
          <p className="mt-1 text-sm text-muted">Attendance and study hours by selected range.</p>
        </div>
        <Select
          className="min-w-36"
          label="Range"
          value={period}
          onChange={(value) => setPeriod(value as StudentAnalytics["period"])}
          options={periods}
        />
      </div>

      {analytics.isLoading ? <LoadingBlock label="Loading analytics" /> : null}
      {analytics.error ? <ErrorState message="Unable to load student analytics." /> : null}
      {!analytics.isLoading && !analytics.error ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel title="Attendance" icon={<Activity className="h-4 w-4" />}>
            <div className="h-full">
              <StudentAttendanceCalendar records={attendance.data ?? []} joiningDate={joiningDate} />
            </div>
          </ChartPanel>

          <ChartPanel title="Study Hours" icon={<Clock className="h-4 w-4" />}>
            <div className="flex flex-col h-full w-full min-w-0">
              {(() => {
                const studyData = analytics.data?.study ?? [];
                const totalHours = studyData.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
                const avgHours = studyData.length > 0 ? totalHours / studyData.length : 0;
                const targetHours = studyData[0]?.target_hours ?? 6;

                return (
                  <>
                    <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-panel p-2.5 text-xs">
                      <div>
                        <p className="text-muted font-medium">Total Study</p>
                        <p className="mt-0.5 text-sm font-semibold text-primary">{totalHours.toFixed(1)} hrs</p>
                      </div>
                      <div>
                        <p className="text-muted font-medium">Average</p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">{avgHours.toFixed(1)} hrs</p>
                      </div>
                      <div>
                        <p className="text-muted font-medium">Target</p>
                        <p className="mt-0.5 text-sm font-semibold text-success">{targetHours} hrs</p>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-w-0 min-h-[220px]">
                      <SharedAreaChart
                        data={studyData}
                        xKey="label"
                        yKeys={[
                          { key: "hours", name: "Study hours", color: "var(--primary)" },
                          { key: "target_hours", name: "Target hours", color: "var(--success)", fillOpacity: 0 },
                        ]}
                        height="100%"
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </ChartPanel>
        </div>
      ) : null}
    </section>
  );
}
