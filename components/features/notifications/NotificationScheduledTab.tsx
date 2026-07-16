"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/StateBlocks";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";

interface NotificationScheduledTabProps {
  canDelete: boolean;
}

export function NotificationScheduledTab({ canDelete }: NotificationScheduledTabProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const scheduled = useQuery({ queryKey: ["scheduled-notifications"], queryFn: endpoints.scheduledNotifications });

  const cancel = useMutation({
    mutationFn: (id: number) => endpoints.cancelScheduledNotification(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scheduled-notifications"] });
      pushToast({ kind: "success", title: "Schedule cancelled" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Cancel failed", message: getErrorMessage(error) }),
  });

  return (
    <section className="bg-panel rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">Scheduled Queue</h3>
          <p className="text-sm font-medium text-muted mt-0.5">Notifications waiting to be sent automatically.</p>
        </div>
      </div>
      <div className="grid gap-4">
        {(scheduled?.data ?? []).map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-border/60 rounded-2xl bg-background/50 hover:bg-panel-strong transition-colors gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-0.5 shrink-0">
                <CalendarPlus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[15px] text-foreground">{item.title}</h4>
                <p className="text-[13px] font-medium text-muted mt-1.5 leading-relaxed">{item.body?.substring(0, 80)}...</p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 text-xs font-bold">
                  <Clock className="w-4 h-4" />
                  Scheduled for: {formatDateTime(item.scheduled_at)}
                </div>
              </div>
            </div>
            {canDelete && (
              <Button size="sm" variant="danger" className="shrink-0 rounded-xl" loading={cancel.isPending} icon={<Trash2 className="h-4 w-4" />} onClick={() => cancel.mutate(item.id)}>
                Cancel Send
              </Button>
            )}
          </div>
        ))}
        {(scheduled?.data ?? []).length === 0 ? <EmptyState title="No scheduled notifications" /> : null}
      </div>
    </section>
  );
}
