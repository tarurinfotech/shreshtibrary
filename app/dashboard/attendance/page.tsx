"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Plus, QrCode } from "lucide-react";
import { AttendanceMatrix, MatrixOptionSelect } from "@/components/features/attendance/AttendanceMatrix";
import { SummaryTab } from "@/components/features/attendance/SummaryTab";
import { AttendanceQrTab } from "@/components/features/attendance/AttendanceQrTab";
import { AttendanceManualModal } from "@/components/features/attendance/AttendanceManualModal";
import { AttendanceHolidayModal } from "@/components/features/attendance/AttendanceHolidayModal";
import { Button } from "@/components/ui/Button";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { AttendanceRecord } from "@/types/api";

// --- Date Utils ---
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key) || currentUser.permissions.includes("all");
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };

  const canMarkAttendance = hasPerm("Attendance.Mark");
  const canManageQR = hasPerm("QRAttendance.Generate");
  const canDeleteQR = hasPerm("QRAttendance.Delete");
  const canManageHoliday = hasPerm("LibraryManagement.Holiday");

  const tab = (searchParams.get("tab") as TabType) ?? "logs";
  const setTab = (newTab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`?${params.toString()}`);
  };

  const [mounted, setMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  
  const [manualOpen, setManualOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);

  useEffect(() => {
    setSelectedMonth(getMonthKey());
    setSelectedWeek(getCurrentWeekWindow());
    setMounted(true);
  }, []);

  const attendanceRange = useMemo(() => buildAttendanceRange(selectedMonth, selectedWeek), [selectedMonth, selectedWeek]);

  // Queries for Logs tab
  const matrixStudents = useQuery({
    queryKey: ["attendance-matrix-students"],
    queryFn: () => endpoints.allStudents({ page_size: 100, status: "LIVE" }),
    enabled: mounted && tab === "logs",
    staleTime: 0,
  });
  
  const attendanceMatrix = useQuery({
    queryKey: ["attendance-matrix", attendanceRange.from, attendanceRange.to],
    queryFn: () => endpoints.allAttendance({ from_date: attendanceRange.from, to_date: attendanceRange.to }),
    enabled: mounted && tab === "logs" && Boolean(attendanceRange.from),
    staleTime: 0,
  });
  
  const holidays = useQuery({
    queryKey: ["holidays", attendanceRange.from, attendanceRange.to],
    queryFn: () => endpoints.holidays({ from_date: attendanceRange.from, to_date: attendanceRange.to, is_active: true }),
    enabled: mounted && tab === "logs" && Boolean(attendanceRange.from),
  });

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: endpoints.settings,
    enabled: mounted && (tab === "logs" || tab === "qr"),
  });

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

  const deleteHoliday = useMutation({
    mutationFn: (id: number) => endpoints.deleteHoliday(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["holidays"] });
      pushToast({ kind: "success", title: "Holiday deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  if (!mounted) {
    return <LoadingBlock label="Initializing..." />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0 shrink-0">
          <PageHeader title="Attendance Management" eyebrow="QR and Logs" />
        </div>

        <div
          role="tablist"
          aria-label="Attendance Views"
          className="flex max-w-full items-center gap-2 overflow-x-auto rounded-lg bg-[color:var(--field)] p-1 hide-scrollbar sm:max-w-md shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "qr"}
            className={`shrink-0 flex-1 whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors focus-ring ${tab === "qr" ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm" : "text-muted hover:text-foreground"}`}
            onClick={() => setTab("qr")}
          >
            QR Code
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "logs"}
            className={`shrink-0 flex-1 whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors focus-ring ${tab === "logs" ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm" : "text-muted hover:text-foreground"}`}
            onClick={() => setTab("logs")}
          >
            Attendance Sheet
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "summary"}
            className={`shrink-0 flex-1 whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors focus-ring ${tab === "summary" ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm" : "text-muted hover:text-foreground"}`}
            onClick={() => setTab("summary")}
          >
            Summary
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canMarkAttendance && (
            <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setManualOpen(true)}>
              Manual Entry
            </Button>
          )}
          {canManageQR && (
            <Button size="sm" icon={<QrCode className="h-3.5 w-3.5" />} onClick={() => setTab("qr")}>
              Generate QR
            </Button>
          )}
        </div>
      </div>

      {tab === "qr" && <AttendanceQrTab canManageQR={canManageQR} canDeleteQR={canDeleteQR} settings={settings.data} />}

      {tab === "logs" && (
        <div id="tabpanel-logs" role="tabpanel" aria-labelledby="tab-logs" className="min-w-0 h-[calc(100vh-220px)] min-h-[500px]">
          <AttendanceMatrix
            days={attendanceRange.days}
            students={matrixStudents.data ?? []}
            records={attendanceMatrixByStudent}
            holidays={holidaysByDate}
            holidayList={holidays.data ?? []}
            settings={settings.data}
            onDeleteHoliday={(id) => deleteHoliday.mutate(id)}
            canManageHoliday={canManageHoliday}
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
                {canManageHoliday && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<CalendarPlus className="h-4 w-4" />}
                    onClick={() => setHolidayOpen(true)}
                  >
                    Holiday
                  </Button>
                )}
              </div>
            }
          />
        </div>
      )}

      {tab === "summary" && <SummaryTab />}

      <AttendanceManualModal 
        open={manualOpen} 
        onClose={() => setManualOpen(false)} 
        canEditManual={canMarkAttendance}
      />
      
      <AttendanceHolidayModal 
        open={holidayOpen} 
        onClose={() => setHolidayOpen(false)} 
        defaultDate={attendanceRange.from}
      />
    </div>
  );
}
