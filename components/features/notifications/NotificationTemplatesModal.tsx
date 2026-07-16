"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/StateBlocks";
import { endpoints, type NotificationPayload } from "@/lib/endpoints";

interface NotificationTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (update: Partial<NotificationPayload>) => void;
}

export function NotificationTemplatesModal({ open, onClose, onSelect }: NotificationTemplatesModalProps) {
  const templates = useQuery({ queryKey: ["notification-templates"], queryFn: endpoints.notificationTemplates });

  return (
    <Modal open={open} title="Quick Templates" onClose={onClose}>
      <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {(templates?.data ?? []).map((template) => (
          <button 
            key={template.id} 
            type="button"
            className="group rounded-2xl border border-border/60 bg-background/50 hover:bg-panel-strong hover:border-primary/40 p-4 text-left text-sm transition-all text-foreground" 
            onClick={() => {
              onSelect({ title: template.title, body: template.body });
              onClose();
            }}
          >
            <span className="font-bold block mb-1.5 group-hover:text-primary transition-colors">{template.title}</span>
            <span className="block text-xs font-medium text-muted line-clamp-2 leading-relaxed">{template.body}</span>
          </button>
        ))}
        {(templates?.data ?? []).length === 0 ? <EmptyState title="No templates found" icon={<Sparkles className="w-8 h-8 opacity-20" />} /> : null}
      </div>
    </Modal>
  );
}
