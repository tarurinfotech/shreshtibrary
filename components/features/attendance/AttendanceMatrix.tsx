"use client";

import { type ReactNode, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
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
        className={`focus-ring flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-semibold shadow-sm transition-all duration-150 ${
          open
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
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-100 ${
                    active
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
    return <LoadingBlock label="Loading attendance matrix" />;
  }

  if (!students.length) {
    return <EmptyState title="No students for attendance matrix" />;
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

      {holidayList.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-[color:var(--field)] px-4 py-2 sm:px-6">
          <span className="text-xs font-medium text-muted">Holidays this period:</span>
          {holidayList.map((holiday) => (
            <Button
              key={holiday.id}
              size="sm"
              variant="secondary"
              className="h-6 rounded-full px-2.5 text-[10px]"
              tooltip="Click to delete holiday"
              onClick={() => onDeleteHoliday(holiday.id)}
            >
              {holiday.date.slice(-2)} {holiday.title}
            </Button>
          ))}
        </div>
      ) : null}

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
                    className={`sticky top-0 z-20 min-w-[48px] border-b border-border px-1 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                      holiday ? "bg-indigo-50/50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" : "bg-panel-strong text-muted"
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
              const name =
                [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") ||
                fullName(student.first_name, student.last_name) ||
                student.username;

              const totals = days.reduce(
                (acc, day) => {
                  const holiday = holidays.get(day);
                  const isFuture = new Date(`${day}T00:00:00`) > new Date();
                  if (holiday || isFuture) return acc;
                  const record = studentRecords?.get(day);
                  if (record?.is_present) {
                    acc.present += 1;
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
                      if (now.getTime() <= openDate.getTime() + paddingMs) return acc;
                    }
                    acc.absent += 1;
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
                      <ProfileAvatar
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

                    let isPending = false;
                    const now = new Date();
                    const m = String(now.getMonth() + 1).padStart(2, "0");
                    const d = String(now.getDate()).padStart(2, "0");
                    const todayStr = `${now.getFullYear()}-${m}-${d}`;
                    
                    if (!isHoliday && !isFuture && !isPresent && day === todayStr && settings?.library_open_time) {
                      const [openHour, openMin] = settings.library_open_time.split(":").map(Number);
                      const openDate = new Date();
                      openDate.setHours(openHour, openMin, 0, 0);
                      const paddingMs = parseInt(settings.attendance_padding_time || "60", 10) * 60000;
                      if (now.getTime() <= openDate.getTime() + paddingMs) {
                        isPending = true;
                      }
                    }

                    return (
                      <td
                        key={day}
                        className={`border-b border-border p-2 text-center align-middle font-black ${
                          isHoliday
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                            : isFuture
                              ? "text-muted"
                              : isPresent
                                ? "bg-[color:var(--attendance-present-cell)] text-emerald-800 dark:text-emerald-300"
                                : isPending
                                  ? "bg-[color:var(--attendance-pending-cell)] text-amber-800 dark:text-amber-300"
                                  : "bg-[color:var(--attendance-absent-cell)] text-rose-800 dark:text-rose-300"
                        }`}
                        title={isPending ? "Pending" : holiday?.title}
                      >
                        {isHoliday ? "H" : isFuture ? "-" : isPresent ? "P" : isPending ? "PN" : "AB"}
                      </td>
                    );
                  })}

                  {/* ── Totals ──────────────────────────────────────────────── */}
                  <td className="sticky right-[80px] z-10 border-b border-l border-border bg-[color:var(--attendance-present-cell)] p-2 text-center align-middle font-black text-emerald-800 shadow-[-1px_0_0_0_var(--border)] dark:text-emerald-300">
                    {totals.present}
                  </td>
                  <td className="sticky right-0 z-10 border-b border-l border-border bg-[color:var(--attendance-absent-cell)] p-2 text-center align-middle font-black text-rose-800 shadow-[-1px_0_0_0_var(--border)] dark:text-rose-300">
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
