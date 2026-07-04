"use client";

import { type ReactNode, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, LoadingBlock } from "@/components/ui/StateBlocks";
import { fullName } from "@/lib/format";
import type { AttendanceRecord, HolidayRecord, StudentProfile } from "@/types/api";

export function MatrixOptionSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className={`relative ${className ?? ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={`focus-ring flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-semibold shadow-sm transition-all duration-150 ${open
            ? "border-primary bg-[color:var(--field)] text-foreground ring-2 ring-primary/20"
            : "border-border bg-[color:var(--field)] text-foreground hover:border-primary/50 hover:bg-[color:var(--hover)]"
          }`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selected?.label ?? label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-[90] mt-1.5 w-full min-w-[180px] overflow-hidden rounded-xl border border-border bg-panel shadow-[0_12px_40px_rgba(0,0,0,0.13)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          role="listbox"
          style={{ animation: "selectDropIn 140ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
        >
          <div className="max-h-60 overflow-y-auto p-1.5">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-100 ${active
                      ? "bg-[color:var(--primary-soft)] font-semibold text-primary"
                      : "text-foreground hover:bg-[color:var(--hover)]"
                    }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={active}
                >
                  <span>{option.label}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}


export function AttendanceMatrix({
  days,
  students,
  records,
  holidays,
  holidayList,
  settings,
  onDeleteHoliday,
  loading,
  actions,
}: {
  days: string[];
  students: StudentProfile[];
  records: Map<number, Map<string, AttendanceRecord>>;
  holidays: Map<string, HolidayRecord>;
  holidayList: HolidayRecord[];
  settings?: { library_open_time?: string; attendance_padding_time?: string };
  onDeleteHoliday: (id: number) => void;
  loading: boolean;
  actions: ReactNode;
}) {
  if (loading) {
    return <LoadingBlock label="Loading attendance Sheet" />;
  }

  if (!students.length) {
    return <EmptyState title="No students for attendance Sheet" />;
  }

  return (
    <section className="flex flex-col rounded-xl border border-border bg-panel shadow-sm h-full">
      <div className="relative z-40 flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Attendance Matrix</h2>
          <p className="mt-0.5 text-xs text-muted">Track daily student presence and absences</p>
        </div>
        {actions}
      </div>

      {(() => {
        const now = new Date();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const todayStr = `${now.getFullYear()}-${m}-${d}`;
        const upcomingHolidays = holidayList.filter((h) => h.date >= todayStr);
        if (upcomingHolidays.length === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-[color:var(--field)] px-4 py-2 sm:px-6">
            <span className="text-xs font-medium text-muted">Upcoming holidays:</span>
            {upcomingHolidays.map((holiday) => {
              const isPast = holiday.date < todayStr;
              return (
                <Button
                  key={holiday.id}
                  size="sm"
                  variant="secondary"
                  className={`group h-6 rounded-full px-2.5 ${isPast ? "pl-3 pr-3" : "pl-3 pr-2"} text-[10px] flex items-center gap-1.5 ${!isPast ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20" : ""}`}
                  tooltip={isPast ? "Past holiday (read-only)" : "Click to delete holiday"}
                  onClick={() => { if (!isPast) onDeleteHoliday(holiday.id); }}
                  disabled={isPast}
                >
                  <span>{holiday.date.slice(-2)} {holiday.title}</span>
                  {!isPast && <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />}
                </Button>
              );
            })}
          </div>
        );
      })()}

      <div className="relative flex-1 overflow-auto bg-panel custom-scrollbar min-w-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[240px] border-b border-r border-border bg-panel-strong px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted shadow-[1px_0_0_0_var(--border)]">
                Student Profile
              </th>
              {days.map((day) => {
                const holiday = holidays.get(day);
                return (
                  <th
                    key={day}
                    className={`sticky top-0 z-20 min-w-[48px] border-b border-border px-1 py-3 text-center text-xs font-bold uppercase tracking-wider ${holiday ? "bg-primary/10 text-primary border-l border-primary/20" : "bg-panel-strong text-muted"
                      }`}
                    title={holiday?.title}
                  >
                    {day.slice(-2)}
                  </th>
                );
              })}
              <th className="sticky right-[80px] top-0 z-30 w-[80px] min-w-[80px] border-b border-l border-border bg-panel-strong px-1 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted shadow-[-1px_0_0_0_var(--border)]">
                Present
              </th>
              <th className="sticky right-0 top-0 z-30 w-[80px] min-w-[80px] border-b border-l border-border bg-panel-strong px-1 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted shadow-[-1px_0_0_0_var(--border)]">
                Absent
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student) => {
              const studentRecords = records.get(student.user_id);
              const name = fullName(student.first_name, student.last_name, student.username);

              const totals = days.reduce(
                (acc, day) => {
                  const holiday = holidays.get(day);
                  const isFuture = new Date(`${day}T00:00:00`) > new Date();
                  let isBeforeJoin = false;
                  if (student.joining_date) {
                    const joinDateUTC = student.joining_date + (student.joining_date.endsWith('Z') ? '' : 'Z');
                    const joinDateObj = new Date(joinDateUTC);
                    const y = joinDateObj.getFullYear();
                    const m = String(joinDateObj.getMonth() + 1).padStart(2, "0");
                    const d = String(joinDateObj.getDate()).padStart(2, "0");
                    const localJoinDateStr = `${y}-${m}-${d}`;
                    isBeforeJoin = day < localJoinDateStr;
                  }
                  
                  if (holiday || isFuture || isBeforeJoin) return acc;
                  const record = studentRecords?.get(day);
                  if (record?.is_present) {
                    acc.present += 1;
                  } else {
                    let isPending = false;
                    if (record) {
                      isPending = record.method === "PENDING";
                    } else {
                      const now = new Date();
                      const m = String(now.getMonth() + 1).padStart(2, "0");
                      const d = String(now.getDate()).padStart(2, "0");
                      const todayStr = `${now.getFullYear()}-${m}-${d}`;
                      if (day === todayStr && settings?.library_open_time) {
                        const [openHour, openMin] = settings.library_open_time.split(":").map(Number);
                        const openDate = new Date();
                        openDate.setHours(openHour, openMin, 0, 0);
                        const paddingMs = parseInt(settings.attendance_padding_time || "60", 10) * 60000;
                        if (now.getTime() <= openDate.getTime() + paddingMs) {
                          isPending = true;
                        }
                      }
                    }
                    if (!isPending) acc.absent += 1;
                  }
                  return acc;
                },
                { present: 0, absent: 0 },
              );

              return (
                <tr key={student.user_id} className="group transition-colors hover:bg-[color:var(--hover)]">
                  {/* ── Sticky name cell ────────────────────────────────────── */}
                  <td className="sticky left-0 z-10 border-r border-border bg-panel px-4 py-2.5 shadow-[1px_0_0_0_var(--border)] group-hover:bg-[color:var(--hover)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={student.profile_image ?? student.profile_photo}
                        name={name}
                        size="sm"
                        shape="circle"
                        status={student.status}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{name}</div>
                        <div className="truncate text-xs font-medium text-muted">
                          {student.student_id ?? student.username}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ── Day cells ───────────────────────────────────────────── */}
                  {days.map((day) => {
                    const holiday = holidays.get(day);
                    const record = studentRecords?.get(day);
                    const isFuture = new Date(`${day}T00:00:00`) > new Date();
                    const isHoliday = Boolean(holiday);
                    const isPresent = Boolean(record?.is_present);

                    let isBeforeJoin = false;
                    if (student.joining_date) {
                      const joinDateUTC = student.joining_date + (student.joining_date.endsWith('Z') ? '' : 'Z');
                      const joinDateObj = new Date(joinDateUTC);
                      const y = joinDateObj.getFullYear();
                      const m = String(joinDateObj.getMonth() + 1).padStart(2, "0");
                      const d = String(joinDateObj.getDate()).padStart(2, "0");
                      const localJoinDateStr = `${y}-${m}-${d}`;
                      isBeforeJoin = day < localJoinDateStr;
                    }

                    let isPending = false;
                    if (record) {
                      isPending = record.method === "PENDING";
                    } else {
                      const now = new Date();
                      const m = String(now.getMonth() + 1).padStart(2, "0");
                      const d = String(now.getDate()).padStart(2, "0");
                      const todayStr = `${now.getFullYear()}-${m}-${d}`;

                      if (!isHoliday && !isFuture && !isPresent && !isBeforeJoin && day === todayStr && settings?.library_open_time) {
                        const [openHour, openMin] = settings.library_open_time.split(":").map(Number);
                        const openDate = new Date();
                        openDate.setHours(openHour, openMin, 0, 0);
                        const paddingMs = parseInt(settings.attendance_padding_time || "60", 10) * 60000;
                        if (now.getTime() <= openDate.getTime() + paddingMs) {
                          isPending = true;
                        }
                      }
                    }

                    return (
                      <td
                        key={day}
                        className={`border-b border-border p-2 text-center align-middle font-black ${isHoliday
                            ? "bg-primary/10 text-primary"
                            : (isFuture || isBeforeJoin)
                              ? "text-muted"
                              : isPresent
                                ? "bg-[color:var(--attendance-present-cell)] text-success"
                                : isPending
                                  ? "bg-[color:var(--attendance-pending-cell)] text-warning"
                                  : "bg-[color:var(--attendance-absent-cell)] text-danger"
                          }`}
                        title={isPending ? "Pending" : holiday?.title}
                      >
                        {isHoliday ? "H" : (isFuture || isBeforeJoin) ? "-" : isPresent ? "P" : isPending ? "PN" : "AB"}
                      </td>
                    );
                  })}

                  {/* ── Totals ──────────────────────────────────────────────── */}
                  <td className="sticky right-[80px] z-10 border-b border-l border-border bg-[color:var(--attendance-present-cell)] p-2 text-center align-middle font-black text-success shadow-[-1px_0_0_0_var(--border)]">
                    {totals.present}
                  </td>
                  <td className="sticky right-0 z-10 border-b border-l border-border bg-[color:var(--attendance-absent-cell)] p-2 text-center align-middle font-black text-danger shadow-[-1px_0_0_0_var(--border)]">
                    {totals.absent}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
