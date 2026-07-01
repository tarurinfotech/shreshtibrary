"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckSquare, Eye, Plus, QrCode, RefreshCcw, TimerOff, Trash2 } from "lucide-react";
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
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatDateTime, fullName, isDateWithinAllowedWindow } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { AttendanceRecord, QRCodeRecord } from "@/types/api";

// --- Date Utils (Fixed for hydration) ---
function getTodayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function getPastDate(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentWeekWindow() {
  const day = new Date().getDate();
  if (day <= 7) return "1-2";
  if (day <= 14) return "2-3";
  if (day <= 21) return "3-4";
  return "4-5";
}

const weekWindows = [
  { value: "1-2", label: "Week 1-2", startDay: 1 },
  { value: "2-3", label: "Week 2-3", startDay: 8 },
  { value: "3-4", label: "Week 3-4", startDay: 15 },
  { value: "4-5", label: "Week 4-5", startDay: 22 },
];

function buildAttendanceRange(selectedMonth: string, selectedWeek: string) {
  if (!selectedMonth) return { from: "", to: "", days: [] };

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthIndex = month - 1;
  const window = weekWindows.find((item) => item.value === selectedWeek) ?? weekWindows[0];
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const start = new Date(year, monthIndex, Math.min(window.startDay, lastDay));
  const end = new Date(year, monthIndex, Math.min(window.startDay + 13, lastDay));
  const days: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end && days.length < 14) {
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    days.push(`${cursor.getFullYear()}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    from: days[0] ?? "",
    to: days[days.length - 1] ?? "",
    days,
  };
}

type TabType = "qr" | "logs" | "summary";

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL synced tab state (survives reload)
  const tab = (searchParams.get("tab") as TabType) ?? "logs";

  const setTab = (newTab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`?${params.toString()}`);
  };

  // Hydration safe state
  const [mounted, setMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [summaryDate, setSummaryDate] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [holidayForm, setHolidayForm] = useState({ date: "", title: "", description: "" });

  const [manualOpen, setManualOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});
  const [selectedQr, setSelectedQr] = useState<QRCodeRecord | null>(null);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayErrors, setHolidayErrors] = useState<Record<string, string>>({}); 
  const [qrExpiryDuration, setQrExpiryDuration] = useState("1day");

  const [absenteePage, setAbsenteePage] = useState(1);
  const absenteePageSize = 10;
  const [streakPage, setStreakPage] = useState(1);
  const streakPageSize = 10;
  useEffect(() => {
    setSelectedMonth(getMonthKey());
    setSelectedWeek(getCurrentWeekWindow());
    setSummaryDate(getTodayDate());
    setManualDate(getTodayDate());
    setHolidayForm(curr => ({ ...curr, date: getTodayDate() }));
    setMounted(true);
  }, []);

  const attendanceRange = useMemo(() => buildAttendanceRange(selectedMonth, selectedWeek), [selectedMonth, selectedWeek]);

  const currentQr = useQuery({ queryKey: ["current-qr"], queryFn: endpoints.currentQr, enabled: mounted && tab === "qr" });
  const qrHistory = useQuery({ queryKey: ["qr-history"], queryFn: () => endpoints.qrHistory({ page_size: 20 }), enabled: mounted && tab === "qr" });
  const qrScans = useQuery({
    queryKey: ["qr-scans", selectedQr?.id],
    queryFn: () => endpoints.qrScans(selectedQr?.id ?? 0),
    enabled: Boolean(selectedQr) && mounted,
  });
  const matrixStudents = useQuery({
    queryKey: ["attendance-matrix-students"],
    queryFn: () => endpoints.allStudents({ page_size: 100, status: "LIVE" }),
    enabled: mounted && tab === "logs",
  });
  const attendanceMatrix = useQuery({
    queryKey: ["attendance-matrix", attendanceRange.from, attendanceRange.to],
    queryFn: () => endpoints.allAttendance({ from_date: attendanceRange.from, to_date: attendanceRange.to }),
    enabled: mounted && tab === "logs" && Boolean(attendanceRange.from),
  });
  const holidays = useQuery({
    queryKey: ["holidays", attendanceRange.from, attendanceRange.to],
    queryFn: () => endpoints.holidays({ from_date: attendanceRange.from, to_date: attendanceRange.to, is_active: true }),
    enabled: mounted && tab === "logs" && Boolean(attendanceRange.from),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: endpoints.settings,
    enabled: mounted && tab === "logs",
  });
  const manualHoliday = useQuery({
    queryKey: ["manual-holiday", manualDate],
    queryFn: () => endpoints.holidays({ date: manualDate, is_active: true }),
    enabled: mounted && manualOpen && Boolean(manualDate),
  });
  const summary = useQuery({
    queryKey: ["attendance-summary", summaryDate],
    queryFn: () => endpoints.attendanceDailySummary(summaryDate || undefined),
    enabled: mounted && tab === "summary"
  });
  const absentees = useQuery({
    queryKey: ["attendance-absentees", summaryDate],
    queryFn: () => endpoints.attendanceAbsentees(summaryDate || undefined),
    enabled: mounted && tab === "summary"
  });
  const streak = useQuery({ queryKey: ["attendance-streak"], queryFn: endpoints.attendanceStreak, enabled: mounted && tab === "summary" });

  const manualStudents = useQuery({
    queryKey: ["manual-attendance-students"],
    queryFn: () => endpoints.allStudents({ status: "LIVE" }),
    enabled: mounted && manualOpen,
  });
  const manualRecords = useQuery({
    queryKey: ["manual-attendance-records", manualDate],
    queryFn: () => endpoints.allAttendance({ date: manualDate }),
    enabled: mounted && manualOpen && Boolean(manualDate),
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
      if (!term) return true;
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

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["attendance"] });
    await queryClient.invalidateQueries({ queryKey: ["attendance-matrix"] });
    await queryClient.invalidateQueries({ queryKey: ["manual-attendance-records"] });
    await queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
    await queryClient.invalidateQueries({ queryKey: ["attendance-absentees"] });
    await queryClient.invalidateQueries({ queryKey: ["attendance-streak"] });
    await queryClient.invalidateQueries({ queryKey: ["holidays"] });
    await queryClient.invalidateQueries({ queryKey: ["manual-holiday"] });
    await queryClient.invalidateQueries({ queryKey: ["current-qr"] });
    await queryClient.invalidateQueries({ queryKey: ["qr-history"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
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
    if (!manualDate) setManualDate(getTodayDate());
    setManualSearch("");
    setManualOverrides({});
    setManualOpen(true);
  };

  const manual = useMutation({
    mutationFn: async () => {
      const rows = manualStudents.data ?? [];
      const payload = rows.map((student) => ({
        student_id: student.user_id,
        date: manualDate,
        is_present: getManualPresence(student.user_id),
      }));
      await endpoints.manualAttendanceBulk(payload);
      return rows.length;
    },
    onSuccess: async () => {
      await invalidate();
      setManualOverrides({});
      setManualOpen(false);
      pushToast({ kind: "success", title: "Attendance saved" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Manual entry failed", message: getErrorMessage(error) }),
  });

  const qrAction = useMutation({
    mutationFn: (action: "generate" | "regenerate" | "expire") => {
      if (action === "regenerate") return endpoints.regenerateQr({ expiry_duration: qrExpiryDuration });
      if (action === "expire") return endpoints.expireQr();
      return endpoints.generateQr({ expiry_duration: qrExpiryDuration });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-qr"] });
      await queryClient.invalidateQueries({ queryKey: ["qr-history"] });
      pushToast({ kind: "success", title: "QR updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "QR action failed", message: getErrorMessage(error) }),
  });

  const deleteQrAction = useMutation({
    mutationFn: (id: number) => endpoints.deleteQr(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["qr-history"] });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const saveHoliday = useMutation({
    mutationFn: () => endpoints.createHoliday(holidayForm),
    onSuccess: async () => {
      await invalidate();
      setHolidayOpen(false);
      setHolidayForm({ date: getTodayDate(), title: "", description: "" });
      pushToast({ kind: "success", title: "Holiday saved" });
    },
    onError: (error) => {
      setHolidayErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Holiday failed", message: getErrorMessage(error) });
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: (id: number) => endpoints.deleteHoliday(id),
    onSuccess: async () => {
      await invalidate();
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
    if (!isDateWithinAllowedWindow(manualDate)) {
      pushToast({ kind: "error", title: "Date not allowed", message: "Attendance can only be edited for today and the previous 2 days." });
      return;
    }
    manual.mutate();
  };

  const submitHoliday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHolidayErrors({});
    saveHoliday.mutate();
  };

  // Prevent UI rendering weird states before hydration
  if (!mounted) {
    return <LoadingBlock label="Initializing..." />;
  }

  const selectedManualCount = (manualStudents.data ?? []).filter((student) => getManualPresence(student.user_id)).length;
  const manualStudentCount = manualStudents.data?.length ?? 0;
  const selectedManualHoliday = (manualHoliday.data ?? [])[0];
  const canEditManual = isDateWithinAllowedWindow(manualDate);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0 shrink-0">
          <PageHeader title="Attendance Management" eyebrow="QR and Logs" />
        </div>

        {/* ARIA Accessible Tabs */}
        <div
          role="tablist"
          aria-label="Attendance Views"
          className="flex max-w-full items-center gap-2 overflow-x-auto rounded-lg bg-[color:var(--field)] p-1 hide-scrollbar sm:max-w-md shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "qr"}
            aria-controls="tabpanel-qr"
            id="tab-qr"
            className={`shrink-0 flex-1 whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors focus-ring ${tab === "qr" ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm" : "text-muted hover:text-foreground"}`}
            onClick={() => setTab("qr")}
          >
            QR Code
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "logs"}
            aria-controls="tabpanel-logs"
            id="tab-logs"
            className={`shrink-0 flex-1 whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors focus-ring ${tab === "logs" ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm" : "text-muted hover:text-foreground"}`}
            onClick={() => setTab("logs")}
          >
            Attendance Sheet
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "summary"}
            aria-controls="tabpanel-summary"
            id="tab-summary"
            className={`shrink-0 flex-1 whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors focus-ring ${tab === "summary" ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm" : "text-muted hover:text-foreground"}`}
            onClick={() => setTab("summary")}
          >
            Summary
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={openManualAttendance}>
            Manual Entry
          </Button>
          <Button size="sm" loading={qrAction.isPending} icon={<QrCode className="h-3.5 w-3.5" />} onClick={() => qrAction.mutate("generate")}>
            Generate QR
          </Button>
        </div>
      </div>

      {tab === "qr" ? (
        <div id="tabpanel-qr" role="tabpanel" aria-labelledby="tab-qr" className="grid items-start gap-4 xl:grid-cols-[380px_1fr]">
          <section className="flex min-w-0 flex-col rounded-xl border border-border bg-panel p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
              <h2 className="text-sm font-bold">Active QR Code</h2>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs" loading={qrAction.isPending} icon={<RefreshCcw className="h-3.5 w-3.5" />} onClick={() => qrAction.mutate("regenerate")}>
                  Regen
                </Button>
                <Button size="sm" variant="danger" className="h-7 px-2.5 text-xs" loading={qrAction.isPending} icon={<TimerOff className="h-3.5 w-3.5" />} onClick={() => qrAction.mutate("expire")}>
                  Expire
                </Button>
              </div>
            </div>

            {/* Expiry Duration Selector */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-medium text-muted">Expiry:</span>
              <div className="flex rounded-lg border border-border bg-[color:var(--field)] p-0.5">
                {[
                  { value: "1day", label: "1 Day" },
                  { value: "7day", label: "7 Days" },
                  { value: "1month", label: "1 Month" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
                      qrExpiryDuration === option.value
                        ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm"
                        : "text-muted hover:text-foreground hover:bg-[color:var(--hover)]"
                    }`}
                    onClick={() => setQrExpiryDuration(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center py-2">
              {currentQr.isLoading ? <LoadingBlock label="Fetching QR..." /> : (currentQr.data ? <QRCodeDisplay qr={currentQr.data} /> : <EmptyState title="No active QR" />)}
            </div>
          </section>

          <section className="flex min-w-0 flex-col rounded-xl border border-border bg-panel p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-foreground">QR Scan History</h2>
            {qrHistory.isLoading ? <LoadingBlock label="Loading History..." /> : (
              <TableShell className="border-0 bg-transparent p-0 shadow-none">
                <Table minWidth={400} className="w-full text-xs">
                  <thead className="bg-[color:var(--field-strong)]">
                    <tr>
                      <Th className="whitespace-nowrap py-2 text-[10px]">Generation Date</Th>
                      <Th className="whitespace-nowrap py-2 text-[10px]">Status</Th>
                      <Th className="whitespace-nowrap py-2 text-[10px]">Expires At</Th>
                      <Th className="whitespace-nowrap py-2 text-right text-[10px]">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(qrHistory.data?.data ?? []).map((qr) => (
                      <tr key={qr.id} className="group hover:bg-[color:var(--hover)]">
                        <Td className="whitespace-nowrap py-2 font-medium">{formatDate(qr.valid_date)}</Td>
                        <Td className="whitespace-nowrap py-2">
                          <Badge variant={qr.is_active ? "success" : "danger"} className="text-[10px]">
                            {qr.is_active ? "Active" : "Expired"}
                          </Badge>
                        </Td>
                        <Td className="whitespace-nowrap py-2 text-muted">{formatDateTime(qr.expires_at ?? qr.expiry_timestamp)}</Td>
                        <Td className="whitespace-nowrap py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="secondary" aria-label={`View scans for ${formatDate(qr.valid_date)}`} className="h-6 px-2 text-[10px]" icon={<Eye className="h-3 w-3" />} onClick={() => setSelectedQr(qr)}>
                              View Scans
                            </Button>
                            {!qr.is_active && (
                              <Button size="sm" variant="danger" aria-label={`Delete QR`} className="h-6 px-2 text-[10px]" icon={<Trash2 className="h-3 w-3" />} onClick={() => deleteQrAction.mutate(qr.id)}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    ))}
                    {(qrHistory.data?.data?.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-muted">No QR history found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </Table>
              </TableShell>
            )}
          </section>
        </div>
      ) : null}

      {tab === "logs" ? (
        <div id="tabpanel-logs" role="tabpanel" aria-labelledby="tab-logs" className="min-w-0 h-[calc(100vh-220px)] min-h-[500px]">
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
                    setHolidayErrors({});
                    setHolidayOpen(true);
                  }}
                >
                  Holiday
                </Button>
              </div>
            }
          />
        </div>
      ) : null}

      {tab === "summary" ? (
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
                    <EntityListItem key={item.student.user_id} title={fullName(item.student.first_name, item.student.last_name)} trailing={<Badge variant="info">{item.streak} days</Badge>} />
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
        </div>
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
              min={getPastDate(2)}
              max={getTodayDate()}
              required
            />
            <Input
              label="Search Students"
              value={manualSearch}
              onChange={(event) => setManualSearch(event.target.value)}
              placeholder="Name, ID, mobile, goal, status"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setVisiblePresence(true)} disabled={!canEditManual || Boolean(selectedManualHoliday)}>
                Select Visible
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setVisiblePresence(false)} disabled={!canEditManual || Boolean(selectedManualHoliday)}>
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

          {!canEditManual ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
              Editing attendance is restricted to the current date and the previous 2 days. This date is read-only.
            </div>
          ) : null}

          {manualStudents.isLoading || manualRecords.isLoading ? <LoadingBlock label="Loading students" /> : null}
          {manualStudents.error || manualRecords.error ? <ErrorState message="Unable to load manual attendance list." /> : null}

          {/* Fixed Responsiveness: Converts to Cards mentally/visually or allows controlled overflow */}
          <div className="grid gap-3 sm:hidden mt-2 max-h-[50vh] overflow-y-auto pr-1">
            {/* Mobile Card Layout Fallback */}
            {filteredManualStudents.map((student) => {
              const existing = manualRecordsByStudent.get(student.user_id);
              const checked = getManualPresence(student.user_id);
              let isBeforeJoin = false;
              if (student.joining_date) {
                const joinDateUTC = student.joining_date + (student.joining_date.endsWith('Z') ? '' : 'Z');
                const joinDateObj = new Date(joinDateUTC);
                const y = joinDateObj.getFullYear();
                const m = String(joinDateObj.getMonth() + 1).padStart(2, "0");
                const d = String(joinDateObj.getDate()).padStart(2, "0");
                const localJoinDateStr = `${y}-${m}-${d}`;
                isBeforeJoin = manualDate < localJoinDateStr;
              }
              return (
                <div key={student.user_id} className="surface flex items-center justify-between p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar src={student.profile_image} name={student.first_name} size="sm" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{fullName(student.first_name, student.last_name)}</span>
                      <span className="text-xs text-muted">{student.student_id}</span>
                      {isBeforeJoin && <span className="text-xs text-muted italic">Not Joined</span>}
                    </div>
                  </div>
                  <input
                    checked={checked}
                    disabled={!canEditManual || Boolean(selectedManualHoliday) || isBeforeJoin}
                    className="h-5 w-5 rounded border-border accent-[var(--primary)] disabled:opacity-50"
                    type="checkbox"
                    aria-label={`Mark ${student.first_name} present`}
                    onChange={(event) => setManualPresence(student.user_id, event.target.checked)}
                  />
                </div>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <TableShell className="max-h-[42vh] overflow-y-auto rounded-lg border border-border bg-transparent p-2 shadow-none">
              <Table className="w-full min-w-full">
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
                    let isBeforeJoin = false;
                    if (student.joining_date) {
                      const joinDateUTC = student.joining_date + (student.joining_date.endsWith('Z') ? '' : 'Z');
                      const joinDateObj = new Date(joinDateUTC);
                      const y = joinDateObj.getFullYear();
                      const m = String(joinDateObj.getMonth() + 1).padStart(2, "0");
                      const d = String(joinDateObj.getDate()).padStart(2, "0");
                      const localJoinDateStr = `${y}-${m}-${d}`;
                      isBeforeJoin = manualDate < localJoinDateStr;
                    }
                    return (
                      <tr key={student.user_id} className="hover:bg-[var(--hover)] transition-colors">
                        <Td>
                          <label className="inline-flex items-center gap-2 cursor-pointer focus-ring">
                            <input
                              checked={checked}
                              disabled={!canEditManual || Boolean(selectedManualHoliday) || isBeforeJoin}
                              className="h-4 w-4 rounded border-border accent-[var(--primary)] focus:ring-primary disabled:opacity-50"
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
                          ) : isBeforeJoin ? (
                            <span className="text-xs text-muted">Not Joined</span>
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
          </div>

          {!manualStudents.isLoading && filteredManualStudents.length === 0 ? <EmptyState title="No students found" /> : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Saving will add new rows or update existing attendance for {manualDate || "selected date"}.
            </p>
            <Button type="submit" loading={manual.isPending} icon={<CheckSquare className="h-4 w-4" />} disabled={!manualStudentCount || Boolean(selectedManualHoliday) || !canEditManual}>
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
            error={holidayErrors.date}
            required
          />
          <Input
            label="Holiday Title"
            value={holidayForm.title}
            onChange={(event) => setHolidayForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Library closed"
            error={holidayErrors.title}
            required
          />
          <Input
            label="Description"
            value={holidayForm.description}
            onChange={(event) => setHolidayForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Optional note"
            error={holidayErrors.description}
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
          {!qrScans.isLoading && (qrScans.data?.length === 0) && <EmptyState title="No scans recorded" />}
        </div>
      </Modal>
    </div>
  );
}
