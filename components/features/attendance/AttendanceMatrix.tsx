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
    <section className="rounded-lg border border-border bg-panel text-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-semibold">Attendance</h2>
          <p className="text-xs text-muted">Month and week attendance view</p>
        </div>
        {actions}
      </div>
      {holidayList.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-2 border-b border-border px-4 py-2">
          {holidayList.map((holiday) => (
            <Button
              key={holiday.id}
              size="sm"
              variant="ghost"
              tooltip="Click to delete holiday"
              type="button"
              onClick={() => onDeleteHoliday(holiday.id)}
            >
              {holiday.date.slice(-2)} {holiday.title}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {/* Column header width bumped to 260px to fit avatar + name */}
              <th className="sticky left-0 top-0 z-20 w-64 border-b border-r border-border bg-[color:var(--field-strong)] px-4 py-3 text-left text-xs font-semibold text-muted">
                Student
              </th>
              {days.map((day) => {
                const holiday = holidays.get(day);
                return (
                  <th
                    key={day}
                    className={`sticky top-0 z-10 min-w-20 border-b border-border px-4 py-3 text-center text-xs font-semibold ${
                      holiday ? "bg-indigo-100/80 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300" : "bg-[color:var(--field-strong)] text-muted"
                    }`}
                    title={holiday?.title}
                  >
                    {day.slice(-2)}
                  </th>
                );
              })}
              <th className="sticky right-20 top-0 z-20 min-w-20 border-b border-l border-border bg-[color:var(--attendance-present-cell)] px-4 py-3 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Present
              </th>
              <th className="sticky right-0 top-0 z-20 min-w-20 border-b border-l border-border bg-[color:var(--attendance-absent-cell)] px-4 py-3 text-center text-xs font-semibold text-rose-700 dark:text-rose-300">
                Absent
              </th>
            </tr>
          </thead>
          <tbody>
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
                <tr key={student.user_id} className="group">
                  {/* ── Sticky name cell with profile avatar ──────────────────── */}
                  <td className="sticky left-0 z-10 h-14 border-b border-r border-border bg-panel px-3 py-2 group-hover:bg-[color:var(--hover)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProfileAvatar
                        src={student.profile_image ?? student.profile_photo}
                        name={name}
                        size="xs"
                        shape="circle"
                        status={student.status}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-foreground max-w-[160px]">{name}</div>
                        <div className="mt-0.5 truncate text-[10px] font-medium text-muted">
                          {student.student_id ?? student.username}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ── Day cells ─────────────────────────────────────────────── */}
                  {days.map((day) => {
                    const holiday = holidays.get(day);
                    const record = studentRecords?.get(day);
                    const isFuture = new Date(`${day}T00:00:00`) > new Date();
                    const isHoliday = Boolean(holiday);
                    const isPresent = Boolean(record?.is_present);

                    let statusStr = isHoliday ? "H" : isFuture ? "-" : isPresent ? "P" : "AB";
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
                        statusStr = "PN";
                        isPending = true;
                      }
                    }

                    return (
                      <td
                        key={day}
                        className={`border-b border-border px-4 py-3 text-center font-black ${
                          isHoliday
                            ? "bg-indigo-100 text-indigo-800 group-hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:group-hover:bg-indigo-900/50"
                            : isFuture
                              ? "bg-[color:var(--attendance-empty)] text-muted group-hover:bg-[color:var(--attendance-empty-hover)]"
                              : isPresent
                                ? "bg-[color:var(--attendance-present-cell)] text-emerald-800 group-hover:bg-[color:var(--attendance-present-hover)] dark:text-emerald-300"
                                : isPending
                                  ? "bg-[color:var(--attendance-pending-cell)] text-amber-800 group-hover:bg-[color:var(--attendance-pending-hover)] dark:text-amber-300"
                                  : "bg-[color:var(--attendance-absent-cell)] text-rose-800 group-hover:bg-[color:var(--attendance-absent-hover)] dark:text-rose-300"
                        }`}
                        title={
                          isPending
                            ? `Pending Attendance (Padding: ${settings?.attendance_padding_time || 60} mins from opening)`
                            : holiday?.title
                        }
                      >
                        {statusStr}
                      </td>
                    );
                  })}

                  {/* ── Present / Absent totals ────────────────────────────────── */}
                  <td className="sticky right-20 z-10 border-b border-l border-border bg-[color:var(--attendance-present-cell)] px-4 py-3 text-center text-sm font-black text-emerald-800 group-hover:bg-[color:var(--attendance-present-hover)] dark:text-emerald-300">
                    {totals.present}
                  </td>
                  <td className="sticky right-0 z-10 border-b border-l border-border bg-[color:var(--attendance-absent-cell)] px-4 py-3 text-center text-sm font-black text-rose-800 group-hover:bg-[color:var(--attendance-absent-hover)] dark:text-rose-300">
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
