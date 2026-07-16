"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { endpoints } from "@/lib/endpoints";
import type { NotificationRecord } from "@/types/api";

interface NotificationRecipientsModalProps {
  selected: NotificationRecord | null;
  onClose: () => void;
}

export function NotificationRecipientsModal({ selected, onClose }: NotificationRecipientsModalProps) {
  const recipients = useQuery({
    queryKey: ["notification-recipients", selected?.id],
    queryFn: () => endpoints.notificationRecipients(selected?.id ?? 0),
    enabled: Boolean(selected),
  });

  return (
    <Modal open={Boolean(selected)} title="Recipients List" onClose={onClose}>
      {recipients.isLoading ? <LoadingBlock label="Loading recipient data..." /> : null}
      <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
        {(recipients?.data ?? []).map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3.5 border-b border-border/50 last:border-0 hover:bg-panel rounded-xl transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {item.student_name.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-[14px] text-foreground">{item.student_name}</span>
            </div>
            <Badge variant={item.is_read ? "success" : "warning"} className={`rounded-full px-3 py-1 font-bold ${item.is_read ? "" : "opacity-80"}`}>
              {item.is_read ? "Read" : "Unread"}
            </Badge>
          </div>
        ))}
      </div>
    </Modal>
  );
}
