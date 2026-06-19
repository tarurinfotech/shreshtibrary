"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Trash2, MailOpen, Mail, UserPlus, CreditCard, MessageSquare, Clock, AlertTriangle, CheckCircle2, Search, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingBlock } from "@/components/ui/StateBlocks";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import { useRouter } from "next/navigation";

export default function AdminInboxPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const router = useRouter();
  
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

  const inbox = useQuery({ queryKey: ["admin-inbox"], queryFn: endpoints.adminInbox });

  const markAction = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "read" | "unread" }) => endpoints.adminInboxAction(id, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-inbox-topbar"] });
    },
    onError: () => pushToast({ kind: "error", title: "Action failed" }),
  });

  const deleteAction = useMutation({
    mutationFn: (id: number) => endpoints.deleteAdminInbox(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-inbox-topbar"] });
      pushToast({ kind: "success", title: "Notification deleted" });
      setSelectedNotification(null);
    },
    onError: () => pushToast({ kind: "error", title: "Deletion failed" }),
  });

  const handleActionClick = (n: any) => {
    if (n.type === "NEW_STUDENT" && n.related_id) {
      router.push(`/dashboard/students/${n.related_id}`);
    } else if (n.type === "PAYMENT") {
      if (n.student_id) {
        router.push(`/dashboard/students/${n.student_id}?tab=payments`);
      } else {
        router.push(`/dashboard/payments`);
      }
    } else if (n.type === "SUPPORT") {
      router.push(`/dashboard/reviews`);
    } else if ((n.type === "EXPIRING_SOON" || n.type === "EXPIRED") && n.student_id) {
      router.push(`/dashboard/students/${n.student_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "NEW_STUDENT": return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "PAYMENT": return <CreditCard className="h-5 w-5 text-emerald-500" />;
      case "SUPPORT": return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "EXPIRING_SOON": return <Clock className="h-5 w-5 text-amber-500" />;
      case "EXPIRED": return <AlertTriangle className="h-5 w-5 text-rose-500" />;
      default: return <Mail className="h-5 w-5 text-slate-500" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'EXPIRED': return 'danger';
      case 'EXPIRING_SOON': return 'warning';
      case 'PAYMENT': return 'success';
      case 'NEW_STUDENT': return 'info';
      default: return 'neutral';
    }
  };

  const notifications = inbox.data ?? [];
  
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filter === "unread") filtered = filtered.filter((n: any) => !n.is_read);
    if (filter === "read") filtered = filtered.filter((n: any) => n.is_read);

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((n: any) => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.message && n.message.toLowerCase().includes(q)) ||
        (n.student_name && n.student_name.toLowerCase().includes(q))
      );
    }
    
    return filtered;
  }, [notifications, filter, search]);

  const columns: Array<DataTableColumn<any>> = [
    {
      id: "status",
      header: "",
      cell: (n) => (
        <div className="flex items-center justify-center">
          {!n.is_read ? (
            <div className="h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/20" title="Unread"></div>
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-slate-200" title="Read"></div>
          )}
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (n) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            n.type === 'PAYMENT' ? 'bg-emerald-500/10' :
            n.type === 'NEW_STUDENT' ? 'bg-blue-500/10' :
            n.type === 'SUPPORT' ? 'bg-purple-500/10' :
            n.type === 'EXPIRING_SOON' ? 'bg-amber-500/10' :
            n.type === 'EXPIRED' ? 'bg-rose-500/10' : 'bg-slate-500/10'
          }`}>
            {getNotificationIcon(n.type)}
          </div>
          <Badge variant={getBadgeVariant(n.type) as any} className="text-[10px] uppercase tracking-widest px-2 font-bold whitespace-nowrap">
            {n.type.replace('_', ' ')}
          </Badge>
        </div>
      ),
    },
    {
      id: "student",
      header: "Student",
      cell: (n) => (
        <div className="flex items-center gap-3 min-w-[150px]">
          <ProfileAvatar src={n.student_avatar} name={n.student_name || "System"} size="sm" />
          <span className="font-semibold text-sm whitespace-nowrap">{n.student_name || "Automated"}</span>
        </div>
      ),
    },
    {
      id: "message",
      header: "Message",
      cell: (n) => (
        <div className="flex flex-col max-w-[400px]">
          <span className={`text-sm font-bold truncate ${n.is_read ? "text-slate-600" : "text-foreground"}`}>{n.title}</span>
          <span className="text-xs text-muted-foreground truncate">{n.message}</span>
        </div>
      ),
    },
    {
      id: "date",
      header: "Date",
      cell: (n) => <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{formatDateTime(n.created_at)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (n) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="!text-red-500 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-500/10"
            onClick={() => deleteAction.mutate(n.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleRowClick = (n: any) => {
    setSelectedNotification(n);
    if (!n.is_read) {
      markAction.mutate({ id: n.id, action: "read" });
    }
  };

  return (
    <>
      <div className="w-full max-w-[95%] xl:max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <PageHeader title="Notification Center" eyebrow="Inbox" />

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              hideLabel 
              label="Search" 
              placeholder="Search notifications..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <Select
              hideLabel
              label="Filter"
              value={filter}
              onChange={(v: any) => setFilter(v)}
              options={[
                { value: "all", label: "All Notifications" },
                { value: "unread", label: "Unread Only" },
                { value: "read", label: "Read Only" }
              ]}
              className="min-w-[160px]"
            />
          </div>
        </div>

        <div className="bg-surface border border-border/50 rounded-xl shadow-sm overflow-hidden">
          <DataTable
            data={filteredNotifications}
            columns={columns}
            getRowKey={(item) => item.id}
            loading={inbox.isLoading}
            onRowClick={handleRowClick}
            minWidth={1100}
            rowClassName={(n: any) => !n.is_read 
              ? "group [&>td]:![background:var(--primary-soft)] [&>td:first-child]:!border-l-4 [&>td:first-child]:!border-[var(--primary)] hover:[&>td]:![background:var(--hover-strong)] transition-colors cursor-pointer [&>td]:!py-4"
              : "group cursor-pointer [&>td]:!py-4"}
            emptyTitle="Inbox is empty"
            emptyMessage="You have no notifications matching the selected filters."
          />
        </div>
      </div>

      <Modal open={Boolean(selectedNotification)} onClose={() => setSelectedNotification(null)} title="Notification Details">
        {selectedNotification && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shadow-sm border ${
                  selectedNotification.type === 'PAYMENT' ? 'bg-emerald-500/10 border-emerald-500/20' :
                  selectedNotification.type === 'NEW_STUDENT' ? 'bg-blue-500/10 border-blue-500/20' :
                  selectedNotification.type === 'SUPPORT' ? 'bg-purple-500/10 border-purple-500/20' :
                  selectedNotification.type === 'EXPIRING_SOON' ? 'bg-amber-500/10 border-amber-500/20' :
                  selectedNotification.type === 'EXPIRED' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-500/10 border-slate-500/20'
                }`}>
                  {getNotificationIcon(selectedNotification.type)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">{selectedNotification.title}</h3>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(selectedNotification.created_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-panel rounded-xl p-5 border border-border/60 text-sm text-foreground/90 leading-relaxed shadow-inner">
              {selectedNotification.message}
              
              {selectedNotification.type === 'PAYMENT' && selectedNotification.message.includes("payment of") && (
                <div className="mt-4 flex flex-col gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-emerald-700">Amount:</span>
                    <span>{selectedNotification.message.match(/payment of (₹?\d+(?:\.\d+)?)/i)?.[1] ? `₹${selectedNotification.message.match(/payment of (₹?\d+(?:\.\d+)?)/i)?.[1]}` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-emerald-700">Method:</span>
                    <span>{selectedNotification.message.match(/via (\w+)/i)?.[1] || "UPI"}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <ProfileAvatar src={selectedNotification.student_avatar} name={selectedNotification.student_name || "System"} size="sm" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{selectedNotification.student_name || "System Automated"}</span>
                  <span className="text-xs text-muted-foreground">Related Entity</span>
                </div>
              </div>
              
              {((selectedNotification.type === "NEW_STUDENT" && selectedNotification.related_id) || 
                ((selectedNotification.type === "PAYMENT" || selectedNotification.type === "EXPIRING_SOON" || selectedNotification.type === "EXPIRED") && selectedNotification.student_id) ||
                selectedNotification.type === "SUPPORT") && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => {
                    handleActionClick(selectedNotification);
                    setSelectedNotification(null);
                  }}
                >
                  Take Action
                </Button>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button 
                variant="danger" 
                className="w-full sm:w-auto"
                onClick={() => deleteAction.mutate(selectedNotification.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
