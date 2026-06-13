"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckSquare, Eye, Plus, QrCode, RefreshCcw, TimerOff } from "lucide-react";
import { AttendanceMatrix, MatrixOptionSelect } from "@/components/features/attendance/AttendanceMatrix";
import { QRCodeDisplay } from "@/components/features/QRCodeDisplay";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EntityListItem } from "@/components/ui/EntityListItem";
import { FormActions } from "@/components/ui/Form";
import { DateInput, Input } from "@/components/ui/Input";
import { MetricTile } from "@/components/ui/MetricTile";
import { Modal } from "@/components/ui/Modal";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { AttendanceRecord, QRCodeRecord } from "@/types/api";

function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function dateKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function monthKey(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

const weekWindows = [
  { value: "1-2", label: "Week 1-2", startDay: 1 },
  { value: "2-3", label: "Week 2-3", startDay: 8 },
  { value: "3-4", label: "Week 3-4", startDay: 15 },
  { value: "4-5", label: "Week 4-5", startDay: 22 },
];

function currentWeekWindow(value = new Date()) {
  const day = value.getDate();
  if (day <= 7) return "1-2";
  if (day <= 14) return "2-3";
  if (day <= 21) return "3-4";
  return "4-5";
}

function buildAttendanceRange(selectedMonth: string, selectedWeek: string) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthIndex = month - 1;
  const window = weekWindows.find((item) => item.value === selectedWeek) ?? weekWindows[0];
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const start = new Date(year, monthIndex, Math.min(window.startDay, lastDay));
  const end = new Date(year, monthIndex, Math.min(window.startDay + 13, lastDay));
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < 14) {
    days.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return {
    from: days[0] ?? todayInputValue(),
    to: days[days.length - 1] ?? todayInputValue(),
    days,
  };
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [tab, setTab] = useState<"qr" | "logs" | "summary">("logs");
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [selectedWeek, setSelectedWeek] = useState(currentWeekWindow());
  const [summaryDate, setSummaryDate] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState(todayInputValue());
  const [manualSearch, setManualSearch] = useState("");
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});
  const [selectedQr, setSelectedQr] = useState<QRCodeRecord | null>(null);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: todayInputValue(), title: "", description: "" });
  const attendanceRange = useMemo(() => buildAttendanceRange(selectedMonth, selectedWeek), [selectedMonth, selectedWeek]);

  const currentQr = useQuery({ queryKey: ["current-qr"], queryFn: endpoints.currentQr });
  const qrHistory = useQuery({ queryKey: ["qr-history"], queryFn: () => endpoints.qrHistory({ page_size: 20 }) });
  const qrScans = useQuery({
    queryKey: ["qr-scans", selectedQr?.id],
    queryFn: () => endpoints.qrScans(selectedQr?.id ?? 0),
    enabled: Boolean(selectedQr),
  });
  const matrixStudents = useQuery({
    queryKey: ["attendance-matrix-students"],
    queryFn: () => endpoints.allStudents({ page_size: 100 }),
    enabled: tab === "logs",
  });
  const attendanceMatrix = useQuery({
    queryKey: ["attendance-matrix", attendanceRange.from, attendanceRange.to],
    queryFn: () => endpoints.allAttendance({ from_date: attendanceRange.from, to_date: attendanceRange.to }),
    enabled: tab === "logs",
  });
  const holidays = useQuery({
    queryKey: ["holidays", attendanceRange.from, attendanceRange.to],
    queryFn: () => endpoints.holidays({ from_date: attendanceRange.from, to_date: attendanceRange.to, is_active: true }),
    enabled: tab === "logs",
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: endpoints.settings,
    enabled: tab === "logs",
  });
  const manualHoliday = useQuery({
    queryKey: ["manual-holiday", manualDate],
    queryFn: () => endpoints.holidays({ date: manualDate, is_active: true }),
    enabled: manualOpen && Boolean(manualDate),
  });
  const summary = useQuery({
    queryKey: ["attendance-summary", summaryDate],
    queryFn: () => endpoints.attendanceDailySummary(summaryDate || undefined),
  });
  const absentees = useQuery({
    queryKey: ["attendance-absentees", summaryDate],
    queryFn: () => endpoints.attendanceAbsentees(summaryDate || undefined),
  });
  const streak = useQuery({ queryKey: ["attendance-streak"], queryFn: endpoints.attendanceStreak });
  const manualStudents = useQuery({
    queryKey: ["manual-attendance-students"],
    queryFn: () => endpoints.allStudents(),
    enabled: manualOpen,
  });
  const manualRecords = useQuery({
    queryKey: ["manual-attendance-records", manualDate],
    queryFn: () => endpoints.allAttendance({ date: manualDate }),
    enabled: manualOpen && Boolean(manualDate),
  });

  const manualRecordsByStudent = useMemo(() => {
    const rows = manualRecords.data ?? [];
    return new Map(rows.map((record) => [record.student, record]));
  }, [manualRecords.data]);

  const attendanceMatrixByStudent = useMemo(() => {
    const map = new Map<number, Map<string, AttendanceRecord>>();
    for (const record of attendanceMatrix.data ?? []) {
      if (!map.has(record.student)) {
        map.set(record.student, new Map());
      }
      map.get(record.student)?.set(record.date, record);
    }
    return map;
  }, [attendanceMatrix.data]);

  const holidaysByDate = useMemo(
    () => new Map((holidays.data ?? []).map((holiday) => [holiday.date, holiday])),
    [holidays.data],
  );

  const filteredManualStudents = useMemo(() => {
    const term = manualSearch.trim().toLowerCase();
    return (manualStudents.data ?? []).filter((student) => {
      if (!term) {
        return true;
      }
      return [
        student.student_id,
        student.username,
        student.first_name,
        student.middle_name,
        student.last_name,
        student.mobile,
        student.goal,
        student.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [manualSearch, manualStudents.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-matrix"] });
    queryClient.invalidateQueries({ queryKey: ["manual-attendance-records"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-absentees"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-streak"] });
    queryClient.invalidateQueries({ queryKey: ["holidays"] });
    queryClient.invalidateQueries({ queryKey: ["manual-holiday"] });
    queryClient.invalidateQueries({ queryKey: ["current-qr"] });
    queryClient.invalidateQueries({ queryKey: ["qr-history"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const getManualPresence = (studentUserId: number) =>
    manualOverrides[studentUserId] ?? manualRecordsByStudent.get(studentUserId)?.is_present ?? false;

  const setManualPresence = (studentUserId: number, isPresent: boolean) => {
    setManualOverrides((current) => ({ ...current, [studentUserId]: isPresent }));
  };

  const setVisiblePresence = (isPresent: boolean) => {
    setManualOverrides((current) => ({
      ...current,
      ...Object.fromEntries(filteredManualStudents.map((student) => [student.user_id, isPresent])),
    }));
  };

  const openManualAttendance = () => {
    setManualDate((current) => current || todayInputValue());
    setManualSearch("");
    setManualOverrides({});
    setManualOpen(true);
  };

  const manual = useMutation({
    mutationFn: async () => {
      const rows = manualStudents.data ?? [];
      for (const student of rows) {
        await endpoints.manualAttendance({
          student_id: student.user_id,
          date: manualDate,
          is_present: getManualPresence(student.user_id),
        });
      }
      return rows.length;
    },
    onSuccess: () => {
      invalidate();
      setManualOverrides({});
      pushToast({ kind: "success", title: "Attendance saved" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Manual entry failed", message: getErrorMessage(error) }),
  });

  const qrAction = useMutation({
    mutationFn: (action: "generate" | "regenerate" | "expire") => {
      if (action === "regenerate") return endpoints.regenerateQr();
      if (action === "expire") return endpoints.expireQr();
      return endpoints.generateQr();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-qr"] });
      queryClient.invalidateQueries({ queryKey: ["qr-history"] });
      pushToast({ kind: "success", title: "QR updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "QR action failed", message: getErrorMessage(error) }),
  });

  const saveHoliday = useMutation({
    mutationFn: () => endpoints.createHoliday(holidayForm),
    onSuccess: () => {
      invalidate();
      setHolidayOpen(false);
      setHolidayForm({ date: todayInputValue(), title: "", description: "" });
      pushToast({ kind: "success", title: "Holiday saved" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Holiday failed", message: getErrorMessage(error) }),
  });

  const deleteHoliday = useMutation({
    mutationFn: (id: number) => endpoints.deleteHoliday(id),
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Holiday deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const submitManual = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualDate) {
      pushToast({ kind: "error", title: "Date required", message: "Select a date before saving attendance." });
      return;
    }
    if ((manualHoliday.data ?? []).length > 0) {
      pushToast({ kind: "error", title: "Holiday selected", message: "Attendance cannot be marked on a holiday." });
      return;
    }
    manual.mutate();
  };

  const submitHoliday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveHoliday.mutate();
  };

  const selectedManualCount = (manualStudents.data ?? []).filter((student) => getManualPresence(student.user_id)).length;
  const manualStudentCount = manualStudents.data?.length ?? 0;
  const selectedManualHoliday = (manualHoliday.data ?? [])[0];

  return (
    <>
      <PageHeader
        title="Attendance"
        eyebrow="QR and Logs"
        actions={
          <>
            <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={openManualAttendance}>
              Manual
            </Button>
            <Button loading={qrAction.isPending} icon={<QrCode className="h-4 w-4" />} onClick={() => qrAction.mutate("generate")}>
              Generate QR
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "qr" ? "primary" : "secondary"} onClick={() => setTab("qr")}>QR</Button>
        <Button variant={tab === "logs" ? "primary" : "secondary"} onClick={() => setTab("logs")}>Logs</Button>
        <Button variant={tab === "summary" ? "primary" : "secondary"} onClick={() => setTab("summary")}>Summary</Button>
      </div>

      {tab === "qr" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <section className="surface rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Current QR</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" loading={qrAction.isPending} icon={<RefreshCcw className="h-4 w-4" />} onClick={() => qrAction.mutate("regenerate")}>Regenerate</Button>
                <Button size="sm" variant="danger" loading={qrAction.isPending} icon={<TimerOff className="h-4 w-4" />} onClick={() => qrAction.mutate("expire")}>Expire</Button>
              </div>
            </div>
            {currentQr.data ? <QRCodeDisplay qr={currentQr.data} /> : <EmptyState title="No active QR" />}
          </section>

          <section className="surface rounded-lg p-5">
            <h2 className="mb-4 font-semibold">QR History</h2>
            <TableShell className="rounded-none border-0 bg-transparent">
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th>Expires</Th>
                    <Th>Scans</Th>
                  </tr>
                </thead>
                <tbody>
                  {(qrHistory.data?.data ?? []).map((qr) => (
                    <tr key={qr.id}>
                      <Td>{formatDate(qr.valid_date)}</Td>
                      <Td><Badge variant={qr.is_active ? "success" : "danger"}>{qr.is_active ? "Active" : "Expired"}</Badge></Td>
                      <Td>{formatDateTime(qr.expires_at ?? qr.expiry_timestamp)}</Td>
                      <Td>
                        <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => setSelectedQr(qr)}>Open</Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableShell>
          </section>
        </div>
      ) : null}

      {tab === "logs" ? (
        <>
          <AttendanceMatrix
            days={attendanceRange.days}
            students={matrixStudents.data ?? []}
            records={attendanceMatrixByStudent}
            holidays={holidaysByDate}
            holidayList={holidays.data ?? []}
            settings={settings.data}
            onDeleteHoliday={(id) => deleteHoliday.mutate(id)}
            loading={matrixStudents.isLoading || attendanceMatrix.isLoading || holidays.isLoading || settings.isLoading}
            actions={
              <div className="relative z-30 flex flex-wrap items-center justify-end gap-2">
                <MonthPicker
                  label="Month"
                  hideLabel
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  className="w-44"
                />
                <MatrixOptionSelect
                  label="Week"
                  value={selectedWeek}
                  options={weekWindows.map((week) => ({ value: week.value, label: week.label }))}
                  onChange={setSelectedWeek}
                  className="w-32"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<CalendarPlus className="h-4 w-4" />}
                  onClick={() => {
                    setHolidayForm({ date: attendanceRange.from, title: "", description: "" });
                    setHolidayOpen(true);
                  }}
                >
                  Holiday
                </Button>
              </div>
            }
          />
        </>
      ) : null}

      {tab === "summary" ? (
        <>
          <div className="max-w-xs">
            <DateInput label="Date" value={summaryDate} onChange={(event) => setSummaryDate(event.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Present" value={summary.data?.present ?? 0} tone="green" />
            <MetricTile label="Pending" value={summary.data?.pending ?? 0} tone="amber" />
            <MetricTile label="Absent" value={summary.data?.absent ?? 0} tone="red" />
            <MetricTile label="Total" value={summary.data?.total ?? 0} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="surface rounded-lg p-5">
              <h2 className="mb-4 font-semibold">Absentees</h2>
              <div className="grid gap-2">
                {(absentees.data ?? []).slice(0, 12).map((student) => (
                  <EntityListItem 
                    key={student.user_id} 
                    title={fullName(student.first_name, student.last_name)} 
                    trailing={
                      <div className="flex flex-col items-end gap-1">
                        {student.attendance_status === 'pending' && <Badge variant="warning">Pending</Badge>}
                        <span className="text-xs text-muted">{student.mobile}</span>
                      </div>
                    } 
                  />
                ))}
              </div>
            </section>
            <section className="surface rounded-lg p-5">
              <h2 className="mb-4 font-semibold">Streaks</h2>
              <div className="grid gap-2">
                {(streak.data ?? []).slice(0, 12).map((item) => (
                  <EntityListItem key={item.student.user_id} title={fullName(item.student.first_name, item.student.last_name)} trailing={<Badge variant="info">{item.streak}</Badge>} />
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}

      <Modal open={manualOpen} title="Manual Attendance" onClose={() => setManualOpen(false)} className="max-w-5xl">
        <form className="grid gap-4" onSubmit={submitManual}>
          <div className="grid gap-3 lg:grid-cols-[180px_1fr_auto] lg:items-end">
            <DateInput
              label="Date"
              value={manualDate}
              onChange={(event) => {
                setManualDate(event.target.value);
                setManualOverrides({});
              }}
              required
            />
            <Input
              label="Search Students"
              value={manualSearch}
              onChange={(event) => setManualSearch(event.target.value)}
              placeholder="Name, ID, mobile, goal, status"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setVisiblePresence(true)}>
                Select Visible
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setVisiblePresence(false)}>
                Clear Visible
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MetricTile label="Students" value={manualStudentCount} size="sm" />
            <MetricTile label="Marked Present" value={selectedManualCount} size="sm" tone="green" />
            <MetricTile label="Marked Absent" value={Math.max(manualStudentCount - selectedManualCount, 0)} size="sm" tone="red" />
          </div>

          {selectedManualHoliday ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
              {selectedManualHoliday.date} is a holiday: {selectedManualHoliday.title}. Attendance cannot be marked for this date.
            </div>
          ) : null}

          {manualStudents.isLoading || manualRecords.isLoading ? <LoadingBlock label="Loading students" /> : null}
          {manualStudents.error || manualRecords.error ? <ErrorState message="Unable to load manual attendance list." /> : null}

          <TableShell className="max-h-[42vh] overflow-y-auto rounded-lg border border-border bg-transparent p-2 shadow-none">
            <Table className="min-w-[720px]">
              <thead>
                <tr>
                  <Th>Present</Th>
                  <Th>Student</Th>
                  <Th>Mobile</Th>
                  <Th>Goal</Th>
                  <Th>Current Record</Th>
                </tr>
              </thead>
              <tbody>
                {filteredManualStudents.map((student) => {
                  const existing = manualRecordsByStudent.get(student.user_id);
                  const checked = getManualPresence(student.user_id);
                  return (
                    <tr key={student.user_id}>
                      <Td>
                        <label className="inline-flex items-center gap-2">
                          <input
                            checked={checked}
                            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                            type="checkbox"
                            onChange={(event) => setManualPresence(student.user_id, event.target.checked)}
                          />
                          <span className="text-xs text-muted">{checked ? "Present" : "Absent"}</span>
                        </label>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ProfileAvatar
                            src={student.profile_image ?? student.profile_photo}
                            name={[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || student.username}
                            size="sm"
                            shape="circle"
                            status={student.status}
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || fullName(student.first_name, student.last_name) || student.username}
                            </div>
                            <div className="text-xs text-muted">{student.student_id ?? student.username}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>{student.mobile || "Not set"}</Td>
                      <Td>{student.goal || "Not set"}</Td>
                      <Td>
                        {existing ? (
                          <Badge variant={existing.is_present ? "success" : "danger"}>
                            {existing.is_present ? "Present" : "Absent"}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">New</Badge>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableShell>

          {!manualStudents.isLoading && filteredManualStudents.length === 0 ? <EmptyState title="No students found" /> : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Saving will add new rows or update existing attendance for {manualDate || "selected date"}.
            </p>
            <Button type="submit" loading={manual.isPending} icon={<CheckSquare className="h-4 w-4" />} disabled={!manualStudentCount || Boolean(selectedManualHoliday)}>
              Save Attendance
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={holidayOpen} title="Add Holiday" onClose={() => setHolidayOpen(false)}>
        <form className="grid gap-4" onSubmit={submitHoliday}>
          <DateInput
            label="Holiday Date"
            value={holidayForm.date}
            onChange={(event) => setHolidayForm((current) => ({ ...current, date: event.target.value }))}
            required
          />
          <Input
            label="Holiday Title"
            value={holidayForm.title}
            onChange={(event) => setHolidayForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Library closed"
            required
          />
          <Input
            label="Description"
            value={holidayForm.description}
            onChange={(event) => setHolidayForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Optional note"
          />
          <FormActions>
            <Button type="submit" loading={saveHoliday.isPending} icon={<CalendarPlus className="h-4 w-4" />}>
              Save Holiday
            </Button>
          </FormActions>
        </form>
      </Modal>

      <Modal open={Boolean(selectedQr)} title="QR Scans" onClose={() => setSelectedQr(null)}>
        {qrScans.isLoading ? <LoadingBlock label="Loading scans" /> : null}
        <div className="grid gap-2">
          {(qrScans.data ?? []).map((scan) => (
            <EntityListItem key={scan.id} title={scan.student_name} trailing={<span className="text-xs text-muted">{formatDate(scan.date)}</span>} />
          ))}
        </div>
      </Modal>
    </>
  );
}
