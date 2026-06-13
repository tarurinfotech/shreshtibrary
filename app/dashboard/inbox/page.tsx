"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Trash2, MailOpen, Mail, UserPlus, CreditCard, MessageSquare, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingBlock } from "@/components/ui/StateBlocks";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";

export default function AdminInboxPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const router = useRouter();
  
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const inbox = useQuery({ queryKey: ["admin-inbox"], queryFn: endpoints.adminInbox });

  const markAction = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "read" | "unread" }) => endpoints.adminInboxAction(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inbox-topbar"] });
    },
    onError: () => pushToast({ kind: "error", title: "Action failed" }),
  });

  const deleteAction = useMutation({
    mutationFn: (id: number) => endpoints.deleteAdminInbox(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inbox-topbar"] });
      pushToast({ kind: "success", title: "Notification deleted" });
    },
    onError: () => pushToast({ kind: "error", title: "Deletion failed" }),
  });

  const handleNotificationClick = (n: any) => {
    if (!n.is_read) {
      markAction.mutate({ id: n.id, action: "read" });
    }

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

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return formatDateTime(dateStr);
  };

  const renderMessage = (msg: string, name: string) => {
    if (!name) return <span className="text-muted-foreground">{msg}</span>;
    
    const startsWithNameRegex = new RegExp(`^(Student\\s+)?${name}\\s+`, 'i');
    if (startsWithNameRegex.test(msg)) {
      return (
        <div className="text-[15px] leading-snug">
          <span className="font-semibold text-foreground mr-1">{name}</span>
          <span className="text-muted-foreground">{msg.replace(startsWithNameRegex, '')}</span>
        </div>
      );
    }
    
    const parts = msg.split(new RegExp(`(${name})`, 'gi'));
    return (
      <div className="text-[15px] leading-snug text-muted-foreground">
        {parts.map((part, i) => 
          part.toLowerCase() === name.toLowerCase() 
            ? <span key={i} className="font-semibold text-foreground">{part}</span>
            : part
        )}
      </div>
    );
  };

  if (inbox.isLoading) return <LoadingBlock />;

  const notifications = inbox.data ?? [];
  
  const filteredNotifications = notifications.filter((n: any) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <PageHeader 
        title="Notification Center" 
        eyebrow="Stay updated" 
        actions={
          <div className="flex bg-surface p-1 rounded-lg border border-border/50 shadow-sm mt-2 sm:mt-0">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-panel"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === "unread" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-panel"}`}
            >
              Unread
              {unreadCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === "unread" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("read")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === "read" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-panel"}`}
            >
              Read
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-surface/50 rounded-2xl border border-border/50 p-12 text-center shadow-sm">
            <EmptyState 
              title={filter === "all" ? "Inbox empty" : filter === "unread" ? "No unread notifications" : "No read notifications"} 
              description="You're all caught up! Check back later." 
              icon={
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary mb-4 shadow-inner">
                  {filter === "unread" ? <CheckCircle2 className="h-10 w-10" /> : <Inbox className="h-10 w-10" />}
                </div>
              } 
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredNotifications.map((n: any) => (
              <div 
                key={n.id} 
                className={`group relative overflow-hidden flex flex-col sm:flex-row rounded-2xl border transition-all duration-300 cursor-pointer ${
                  n.is_read 
                    ? 'bg-surface/40 border-border/40 hover:bg-surface hover:border-border/60 hover:shadow-sm opacity-85 hover:opacity-100' 
                    : 'bg-background border-border shadow-md hover:shadow-lg'
                }`}
                onClick={() => handleNotificationClick(n)}
              >
                {/* Left Accent Bar */}
                <div className={`hidden sm:flex w-16 shrink-0 flex-col items-center justify-start pt-5 border-r border-border/50 relative overflow-hidden ${
                  n.type === 'PAYMENT' ? 'bg-emerald-500/10 text-emerald-600' :
                  n.type === 'NEW_STUDENT' ? 'bg-blue-500/10 text-blue-600' :
                  n.type === 'SUPPORT' ? 'bg-purple-500/10 text-purple-600' :
                  n.type === 'EXPIRING_SOON' ? 'bg-amber-500/10 text-amber-600' :
                  n.type === 'EXPIRED' ? 'bg-rose-500/10 text-rose-600' :
                  'bg-primary/10 text-primary'
                }`}>
                  {!n.is_read && (
                    <div className={`absolute top-0 right-0 left-0 h-1.5 ${
                      n.type === 'PAYMENT' ? 'bg-emerald-500' :
                      n.type === 'NEW_STUDENT' ? 'bg-blue-500' :
                      n.type === 'SUPPORT' ? 'bg-purple-500' :
                      n.type === 'EXPIRING_SOON' ? 'bg-amber-500' :
                      n.type === 'EXPIRED' ? 'bg-rose-500' :
                      'bg-primary'
                    }`}></div>
                  )}
                  <div className="p-3 transition-transform duration-300 group-hover:scale-110">
                    {getNotificationIcon(n.type)}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-4 sm:p-5 min-w-0 flex flex-col justify-start">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-bold tracking-tight ${n.is_read ? 'text-foreground/70' : 'text-foreground group-hover:text-primary transition-colors'}`}>
                        {n.title}
                      </h3>
                      {!n.is_read && <span className="flex h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20 shrink-0"></span>}
                    </div>
                    <span className="text-[12px] font-medium text-muted-foreground shrink-0 flex items-center gap-1.5 whitespace-nowrap bg-panel/50 px-2 py-1 rounded-md border border-border/40">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(n.created_at)}
                    </span>
                  </div>

                  <div className={`text-[14px] leading-relaxed mb-4 ${n.is_read ? 'opacity-80' : ''}`}>
                    {renderMessage(n.message, n.student_name)}
                  </div>

                  {/* Payment Attachment Block */}
                  {n.type === 'PAYMENT' && (
                    <div className="mb-4 inline-flex items-center gap-4 py-2.5 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 shadow-inner shrink-0">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="shrink-0">
                        <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-600/80 mb-0.5">Amount Paid</div>
                        <div className="text-sm font-semibold text-foreground">
                          {n.message.match(/payment of (₹?\d+(?:\.\d+)?)/i)?.[1] ? `₹${n.message.match(/payment of (₹?\d+(?:\.\d+)?)/i)?.[1]}` : "₹0.00"}
                        </div>
                      </div>
                      <div className="w-[1px] h-8 bg-emerald-500/20 mx-2 shrink-0"></div>
                      <div className="shrink-0">
                        <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-600/80 mb-0.5">Method</div>
                        <div className="text-sm font-semibold text-foreground">
                          {n.message.match(/via (\w+)/i)?.[1] || "UPI"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-auto pt-4 border-t border-border/40">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar
                        src={n.student_avatar}
                        name={n.student_name || "System"}
                        size="sm"
                        shape="circle"
                        className="ring-2 ring-background shadow-sm"
                      />
                      <span className="text-sm font-semibold text-foreground/90">{n.student_name || "System Automated"}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <Badge variant={getBadgeVariant(n.type) as any} className="text-[10px] uppercase tracking-widest py-0.5 px-2.5 rounded-full font-bold shadow-sm">
                        {n.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <Button 
                        variant="secondary"
                        size="sm"
                        className={`h-8 text-[11px] font-bold px-3 rounded-full uppercase tracking-wider shadow-sm transition-colors ${n.is_read ? 'bg-panel hover:bg-panel-strong text-muted-foreground' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAction.mutate({ id: n.id, action: n.is_read ? "unread" : "read" });
                        }}
                      >
                        {n.is_read ? <Mail className="h-3.5 w-3.5 mr-1.5 opacity-70" /> : <MailOpen className="h-3.5 w-3.5 mr-1.5 text-primary" />}
                        {n.is_read ? "Mark Unread" : "Mark Read"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-danger/80 bg-danger/5 hover:bg-danger hover:text-white transition-colors shadow-sm border border-danger/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAction.mutate(n.id);
                        }}
                        title="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
