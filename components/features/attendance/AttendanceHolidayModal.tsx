"use client";

import { FormEvent, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { FormActions } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";

function getTodayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

interface AttendanceHolidayModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export function AttendanceHolidayModal({ open, onClose, defaultDate }: AttendanceHolidayModalProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [holidayForm, setHolidayForm] = useState({ date: getTodayDate(), title: "", description: "" });
  const [holidayErrors, setHolidayErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setHolidayForm({ date: defaultDate || getTodayDate(), title: "", description: "" });
      setHolidayErrors({});
    }
  }, [open, defaultDate]);

  const saveHoliday = useMutation({
    mutationFn: () => endpoints.createHoliday(holidayForm),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["holidays"] });
      const previousHolidays = queryClient.getQueryData(["holidays"]);

      queryClient.setQueryData(["holidays"], (old: any) => {
        if (!old) return [];
        return [
          ...old,
          {
            id: Date.now(),
            date: holidayForm.date,
            title: holidayForm.title,
            description: holidayForm.description,
            is_active: true,
          }
        ];
      });

      return { previousHolidays };
    },
    onError: (error, variables, context) => {
      if (context?.previousHolidays) {
        queryClient.setQueryData(["holidays"], context.previousHolidays);
      }
      setHolidayErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Holiday failed", message: getErrorMessage(error) });
    },
    onSuccess: () => {
      onClose();
      pushToast({ kind: "success", title: "Holiday saved" });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["holidays"] });
      await queryClient.invalidateQueries({ queryKey: ["manual-holiday"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },

  });

  const submitHoliday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHolidayErrors({});
    saveHoliday.mutate();
  };

  return (
    <Modal open={open} title="Add Holiday" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submitHoliday}>
        <DateInput
          label="Holiday Date"
          value={holidayForm.date}
          onChange={(event) => setHolidayForm((current) => ({ ...current, date: event.target.value }))}
          min={getTodayDate()}
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
  );
}
