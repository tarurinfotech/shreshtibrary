"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { NotificationComposer } from "@/components/features/notifications/NotificationComposer";
import { NotificationExpiryTab } from "@/components/features/notifications/NotificationExpiryTab";
import { NotificationHistoryTab } from "@/components/features/notifications/NotificationHistoryTab";
import { NotificationScheduledTab } from "@/components/features/notifications/NotificationScheduledTab";
import { NotificationTemplatesModal } from "@/components/features/notifications/NotificationTemplatesModal";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { type NotificationPayload } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";

const emptyNotification: NotificationPayload = {
  title: "",
  body: "",
  type: "GENERAL",
  target: "ALL",
  target_group: "all",
  send_push: true,
  send_email: false,
  send_sms: false,
  send_whatsapp: false,
  layout: "text_only",
  audience: "all",
  display_mode: "persistent",
  subtitle: "",
  description: "",
  link_url: "",
  link_button_text: "",
  event_date: "",
  scheduled_at: "",
  recurring_time: "",
  expires_at: "",
  selected_students: "",
};

export default function NotificationsPage() {
  const currentUser = useAuthStore((state) => state.user);

  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser?.permissions)) return currentUser.permissions.includes(key);
    return Boolean((currentUser?.permissions as Record<string, unknown>)?.[key]);
  };

  const canDelete = hasPerm("NotificationManagement.Delete");
  const canCreate = hasPerm("NotificationManagement.Create");

  const [tab, setTab] = useState<"send" | "template" | "history" | "scheduled">("send");
  const [form, setForm] = useState<NotificationPayload>(emptyNotification);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <PageHeader title="Push Notifications" eyebrow="Broadcast Manager" />
          <p className="text-muted text-sm mt-1 mb-4">Engage your students with beautifully designed announcements.</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
        <SegmentedControl
          value={tab}
          onChange={setTab as any}
          options={[
            { value: "send", label: "Create Message" },
            { value: "template", label: "Expiry Settings" },
            { value: "history", label: "History" },
            { value: "scheduled", label: "Scheduled" },
          ]}
        />
        {tab === "send" && (
          <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={() => setTemplateModalOpen(true)} className="shrink-0">
            Quick Templates
          </Button>
        )}
      </div>

      {tab === "send" && (
        <NotificationComposer 
          canCreate={canCreate} 
          onOpenTemplates={() => setTemplateModalOpen(true)}
          form={form}
          setForm={setForm}
        />
      )}

      {tab === "template" && (
        <div className="max-w-3xl">
          <NotificationExpiryTab />
        </div>
      )}

      {tab === "history" && (
        <NotificationHistoryTab canDelete={canDelete} />
      )}

      {tab === "scheduled" && (
        <div className="max-w-4xl">
          <NotificationScheduledTab canDelete={canDelete} />
        </div>
      )}

      <NotificationTemplatesModal 
        open={templateModalOpen} 
        onClose={() => setTemplateModalOpen(false)}
        onSelect={(update) => setForm(curr => ({ ...curr, ...update }))}
      />
    </div>
  );
}
