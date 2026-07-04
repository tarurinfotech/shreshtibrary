/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import type { AttendanceRecord, HolidayRecord } from "@/types/api";
import { endpoints } from "@/lib/endpoints";

type Props = {
  records: AttendanceRecord[];
  joiningDate?: string;
};

export function StudentAttendanceCalendar({ records, joiningDate }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const fromDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const toDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const settings = useQuery({ queryKey: ["settings"], queryFn: endpoints.settings });
  const holidays = useQuery({
    queryKey: ["holidays", fromDate, toDate],
    queryFn: () => endpoints.holidays({ from_date: fromDate, to_date: toDate, is_active: true }),
  });

  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      map.set(r.date, r);
    });
    return map;
  }, [records]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, HolidayRecord>();
    const data = holidays.data;
    const array = Array.isArray(data) ? data : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) ? (data as any).data : [];
    array.forEach((h: any) => map.set(h.date, h));
    return map;
  }, [holidays.data]);

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="rounded p-1 hover:bg-[color:var(--hover)] text-muted hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={nextMonth} className="rounded p-1 hover:bg-[color:var(--hover)] text-muted hover:text-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted mb-3 border-b border-border pb-2">
        {dayNames.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      
      <div className="grid grid-cols-7 gap-1 flex-1 content-start">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="rounded-md" />;
          }
          
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const record = recordMap.get(dateStr);
          const holiday = holidayMap.get(dateStr);
          
          // Use noon to avoid timezone shift issues
          const cellDate = new Date(`${dateStr}T12:00:00`);
          const now = new Date();
          
          // Consider a day 'future' if it's strictly greater than today (ignoring time)
          const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
          const isFuture = cellDate.getTime() > todayDate.getTime();
          
          const isHoliday = Boolean(holiday);
          const isPresent = Boolean(record?.is_present);

          let bgClass = "bg-[color:var(--panel-strong)] text-foreground border border-border/50";
          let titleStr = dateStr;

          if (isHoliday) {
             titleStr = `${dateStr}: Holiday (${holiday?.title})`;
             bgClass = "bg-primary/10 text-primary font-bold shadow-sm border border-primary/20";
          } else if (isFuture) {
             bgClass = "bg-[color:var(--attendance-empty)] text-muted border border-border/20 opacity-60";
          } else if (joiningDate && cellDate.getTime() < new Date(`${joiningDate.substring(0, 10)}T00:00:00`).getTime()) {
             bgClass = "bg-[color:var(--attendance-empty)] text-muted border border-border/20 opacity-60 text-[10px]";
             titleStr = `${dateStr}: Not Joined Yet`;
             return (
               <div key={index} title={titleStr} className={clsx("flex items-center justify-center rounded-md text-sm transition-colors cursor-default h-8 xl:h-9 w-full", bgClass)}>
                 -
               </div>
             );
          } else if (isPresent) {
             titleStr = `${dateStr}: Present`;
             bgClass = "bg-[color:var(--attendance-present-cell)] text-success font-bold shadow-sm border border-success/20";
          } else {
             let isPending = false;
             const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
             
             if (dateStr === todayStr && settings.data?.library_open_time) {
                const [openHour, openMin] = settings.data.library_open_time.split(':').map(Number);
                const openDate = new Date();
                openDate.setHours(openHour, openMin, 0, 0);
                const paddingMs = (parseInt(settings.data.attendance_padding_time || "60", 10)) * 60000;
                
                if (now.getTime() <= openDate.getTime() + paddingMs) {
                   isPending = true;
                }
             }

             if (isPending) {
                titleStr = `${dateStr}: Pending`;
                bgClass = "bg-[color:var(--attendance-pending-cell)] text-warning font-bold shadow-sm border border-warning/20";
             } else {
                titleStr = `${dateStr}: Absent`;
                bgClass = "bg-[color:var(--attendance-absent-cell)] text-danger font-bold shadow-sm border border-danger/20";
             }
          }

          return (
            <div
              key={index}
              title={titleStr}
              className={clsx(
                "flex items-center justify-center rounded-md text-sm transition-colors cursor-default h-8 xl:h-9 w-full",
                bgClass
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
      
      <div className="mt-auto pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
         <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-success/20 bg-[color:var(--attendance-present-cell)]" /> Present</div>
         <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-danger/20 bg-[color:var(--attendance-absent-cell)]" /> Absent</div>
         <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-warning/20 bg-[color:var(--attendance-pending-cell)]" /> Pending</div>
         <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-primary/20 bg-primary/10" /> Holiday</div>
      </div>
    </div>
  );
}

