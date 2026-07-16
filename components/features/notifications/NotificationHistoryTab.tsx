"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { NotificationRecord } from "@/types/api";
import { NotificationRecipientsModal } from "./NotificationRecipientsModal";
import { NotificationDetailsModal } from "./NotificationDetailsModal";

interface NotificationHistoryTabProps {
  canDelete: boolean;
}

export function NotificationHistoryTab({ canDelete }: NotificationHistoryTabProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<NotificationRecord | null>(null);
  const [viewingNotification, setViewingNotification] = useState<NotificationRecord | null>(null);

  const notifications = useQuery({ 
    queryKey: ["notifications", page], 
    queryFn: () => endpoints.notifications({ page, page_size: 20 }) 
  });

  const clearAll = useMutation({
    mutationFn: endpoints.clearAllNotifications,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      pushToast({ kind: "success", title: "All notifications cleared" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Failed to clear", message: getErrorMessage(error) }),
  });

  const notificationColumns: Array<DataTableColumn<NotificationRecord>> = [
    {
      id: "message",
      header: "Message",
      cell: (item) => (
        <>
          <div className="font-medium">{item.title}</div>
          <div className="text-xs text-muted">{item.body}</div>
        </>
      ),
    },
    { id: "target", header: "Target", cell: (item) => item.target_group },
    { id: "recipients", header: "Recipients", cell: (item) => <Badge variant="info">{item.success_count}/{item.total_recipients}</Badge> },
    { id: "sent", header: "Sent", cell: (item) => formatDateTime(item.sent_at ?? item.created_at) },
    {
      id: "action",
      header: "Action",
      cell: (item) => (
        <Button 
          size="sm" 
          variant="secondary" 
          icon={<Users className="h-4 w-4" />} 
          onClick={(e) => {
            e.stopPropagation();
            setSelected(item);
          }}
        >
          Recipients
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-foreground">Notification History</h2>
          {canDelete && (
            <Button 
              variant="danger" 
              size="sm" 
              icon={<Trash2 className="w-4 h-4" />} 
              loading={clearAll.isPending}
              onClick={() => {
                if (confirm("Are you sure you want to delete all notification history? This action cannot be undone.")) {
                  clearAll.mutate();
                }
              }}
            >
              Clear All History
            </Button>
          )}
        </div>
        <div className="bg-panel rounded-2xl border border-border shadow-sm overflow-hidden p-1">
          <DataTable
            data={notifications?.data?.data ?? []}
            columns={notificationColumns}
            getRowKey={(item) => item.id}
            loading={notifications.isLoading}
            error={notifications.error ? "Unable to load notifications." : false}
            emptyTitle="No past notifications found"
            onRowClick={(row) => setViewingNotification(row)}
            pagination={
              notifications?.data?.total_pages && notifications.data.total_pages > 1
                ? {
                    currentPage: notifications.data.current_page ?? page,
                    totalPages: notifications.data.total_pages,
                    onPageChange: (p) => setPage(p),
                  }
                : undefined
            }
          />
        </div>
      </div>

      <NotificationRecipientsModal selected={selected} onClose={() => setSelected(null)} />
      <NotificationDetailsModal notification={viewingNotification} onClose={() => setViewingNotification(null)} />
    </>
  );
}
