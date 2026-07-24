"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { MetricTile } from "@/components/ui/MetricTile";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { fullName, isDateWithinAllowedWindow } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";

// Utils
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

interface AttendanceManualModalProps {
  open: boolean;
  onClose: () => void;
  canEditManual: boolean;
}

export function AttendanceManualModal({ open, onClose, canEditManual }: AttendanceManualModalProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [manualDate, setManualDate] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      setManualDate(getTodayDate());
      setManualSearch("");
      setManualOverrides({});
    }
  }, [open]);

  const manualStudents = useQuery({
    queryKey: ["manual-attendance-students"],
    queryFn: () => endpoints.allStudents({ status: "LIVE" }),
    enabled: open,
    staleTime: 0,
  });

  const manualRecords = useQuery({
    queryKey: ["manual-attendance-records", manualDate],
    queryFn: () => endpoints.allAttendance({ date: manualDate }),
    enabled: open && Boolean(manualDate),
    staleTime: 0,
  });

  const manualHoliday = useQuery({
    queryKey: ["manual-holiday", manualDate],
    queryFn: () => endpoints.holidays({ from_date: manualDate, to_date: manualDate, is_active: true }),
    enabled: open && Boolean(manualDate),
  });

  useEffect(() => {
    if (!manualRecords.data || manualRecords.data.length === 0) return;
    setManualOverrides((current) => {
      const updated = { ...current };
      for (const record of manualRecords.data!) {
        if (!(record.student in updated)) {
          updated[record.student] = record.is_present;
        }
      }
      return updated;
    });
  }, [manualRecords.data]);

  const manualRecordsByStudent = useMemo(() => {
    const rows = manualRecords.data ?? [];
    return new Map(rows.map((record) => [record.student, record]));
  }, [manualRecords.data]);

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

  const manual = useMutation({
    mutationFn: async () => {
      const rows = manualStudents.data ?? [];
      const payload = [];

      for (const student of rows) {
        const studentId = student.user_id;
        const currentPresence = getManualPresence(studentId);
        const existingRecord = manualRecordsByStudent.get(studentId);
        
        let isChanged = false;
        if (existingRecord) {
          if (existingRecord.is_present !== currentPresence) {
            isChanged = true;
          }
        } else {
          // For students without an existing record, send if they were explicitly changed
          if (studentId in manualOverrides) {
            isChanged = true;
          }
        }

        if (isChanged) {
          payload.push({
            student_id: studentId,
            date: manualDate,
            is_present: currentPresence,
          });
        }
      }

      if (payload.length > 0) {
        await endpoints.manualAttendanceBulk(payload);
      }
      return payload.length;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["manual-attendance-records", manualDate] });
      await queryClient.cancelQueries({ queryKey: ["attendance-matrix"] });

      const previousRecords = queryClient.getQueryData(["manual-attendance-records", manualDate]);
      const previousMatrix = queryClient.getQueriesData({ queryKey: ["attendance-matrix"] });

      // Optimistically update manual records
      queryClient.setQueryData(["manual-attendance-records", manualDate], (old: any) => {
        const rows = manualStudents.data ?? [];
        return rows.map((student) => ({
          id: (old ?? []).find((r: any) => r.student === student.user_id)?.id ?? Date.now() + student.user_id,
          student: student.user_id,
          date: manualDate,
          is_present: getManualPresence(student.user_id),
          created_at: new Date().toISOString(),
        }));
      });

      return { previousRecords, previousMatrix };
    },
    onError: (error, variables, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(["manual-attendance-records", manualDate], context.previousRecords);
      }
      if (context?.previousMatrix) {
        context.previousMatrix.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      pushToast({ kind: "error", title: "Manual entry failed", message: getErrorMessage(error) });
    },
    onSuccess: () => {
      setManualOverrides({});
      onClose();
      pushToast({ kind: "success", title: "Attendance saved" });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance-matrix"] });
      await queryClient.invalidateQueries({ queryKey: ["manual-attendance-records"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const selectedManualCount = (manualStudents.data ?? []).filter((student) => getManualPresence(student.user_id)).length;
  const manualStudentCount = manualStudents.data?.length ?? 0;
  const selectedManualHoliday = (manualHoliday.data ?? [])[0];
  const isDateAllowed = isDateWithinAllowedWindow(manualDate);
  const canEdit = canEditManual && isDateAllowed;

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
    if (!isDateAllowed) {
      pushToast({ kind: "error", title: "Date not allowed", message: "Attendance can only be edited for today and the previous 2 days." });
      return;
    }
    manual.mutate();
  };

  return (
    <Modal open={open} title="Manual Attendance" onClose={onClose} size="2xl" className="max-w-5xl">
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
            <Button type="button" variant="secondary" size="sm" onClick={() => setVisiblePresence(true)} disabled={!canEdit || Boolean(selectedManualHoliday)}>
              Select Visible
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setVisiblePresence(false)} disabled={!canEdit || Boolean(selectedManualHoliday)}>
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

        {!isDateAllowed ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
            Editing attendance is restricted to the current date and the previous 2 days. This date is read-only.
          </div>
        ) : null}

        {manualStudents.isLoading || manualRecords.isLoading ? <LoadingBlock label="Loading students" /> : null}
        {manualStudents.error || manualRecords.error ? <ErrorState message="Unable to load manual attendance list." /> : null}

        {/* Mobile View */}
        <div className="grid gap-3 sm:hidden mt-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredManualStudents.map((student) => {
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
                  <Avatar src={student.profile_image} name={student.first_name} size="sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{fullName(student.first_name, student.last_name)}</span>
                    <span className="text-xs text-muted">{student.student_id}</span>
                    {isBeforeJoin && <span className="text-xs text-muted italic">Not Joined</span>}
                  </div>
                </div>
                <input
                  checked={checked}
                  disabled={!canEdit || Boolean(selectedManualHoliday) || isBeforeJoin}
                  className="h-5 w-5 rounded border-border accent-[var(--primary)] disabled:opacity-50"
                  type="checkbox"
                  aria-label={`Mark ${student.first_name} present`}
                  onChange={(event) => setManualPresence(student.user_id, event.target.checked)}
                />
              </div>
            )
          })}
        </div>

        {/* Desktop View */}
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
                            disabled={!canEdit || Boolean(selectedManualHoliday) || isBeforeJoin}
                            className="h-4 w-4 rounded border-border accent-[var(--primary)] focus:ring-primary disabled:opacity-50"
                            type="checkbox"
                            onChange={(event) => setManualPresence(student.user_id, event.target.checked)}
                          />
                          <span className="text-xs text-muted">{checked ? "Present" : "Absent"}</span>
                        </label>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
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
          <Button type="submit" loading={manual.isPending} icon={<CheckSquare className="h-4 w-4" />} disabled={!manualStudentCount || Boolean(selectedManualHoliday) || !canEdit}>
            Save Attendance
          </Button>
        </div>
      </form>
    </Modal>
  );
}
