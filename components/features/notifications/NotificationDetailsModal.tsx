"use client";

import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/format";
import type { NotificationRecord } from "@/types/api";

interface NotificationDetailsModalProps {
  notification: NotificationRecord | null;
  onClose: () => void;
}

export function NotificationDetailsModal({ notification, onClose }: NotificationDetailsModalProps) {
  return (
    <Modal open={Boolean(notification)} title="Notification Details" onClose={onClose}>
      {notification && (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            
            {/* Display background image or first gallery image if available */}
            {(notification.background_image || (notification.images && notification.images.length > 0)) && (
              <div className="col-span-2 mb-2 border rounded-xl overflow-hidden bg-background relative flex justify-center">
                 <img 
                   src={notification.background_image || notification.images?.[0]} 
                   alt="Notification Media" 
                   className="max-h-48 object-contain w-full"
                 />
              </div>
            )}

            <div className="col-span-2 sm:col-span-1">
               <div className="text-xs text-muted">Title</div>
               <div className="font-medium text-foreground">{notification.title}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
               <div className="text-xs text-muted">Type / Target</div>
               <div className="font-medium text-foreground">{notification.type} - {notification.target_group}</div>
            </div>
            
            {notification.subtitle && (
              <div className="col-span-2">
                 <div className="text-xs text-muted">Subtitle</div>
                 <div className="font-medium text-foreground">{notification.subtitle}</div>
              </div>
            )}

            <div className="col-span-2">
               <div className="text-xs text-muted">Body</div>
               <div className="text-sm bg-background p-3 rounded-md border mt-1 text-foreground">{notification.body}</div>
            </div>

            {notification.description && (
              <div className="col-span-2">
                 <div className="text-xs text-muted">Description</div>
                 <div className="text-sm bg-background p-3 rounded-md border mt-1 text-foreground whitespace-pre-wrap">{notification.description}</div>
              </div>
            )}

            {notification.link_url && (
              <div className="col-span-2">
                 <div className="text-xs text-muted">Link</div>
                 <a href={notification.link_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline font-medium break-all">
                   {notification.link_button_text || notification.link_url}
                 </a>
              </div>
            )}

            <div>
               <div className="text-xs text-muted">Layout Mode</div>
               <div className="font-medium capitalize text-foreground">{(notification.layout || "text_only").replace("_", " ")}</div>
            </div>

            <div>
               <div className="text-xs text-muted">Channels</div>
               <div className="flex gap-1.5 mt-1 flex-wrap">
                 {notification.send_push && <Badge variant="neutral" className="text-[10px]">Push</Badge>}
                 {notification.send_email && <Badge variant="neutral" className="text-[10px]">Email</Badge>}
                 {notification.send_sms && <Badge variant="neutral" className="text-[10px]">SMS</Badge>}
               </div>
            </div>

            <div>
               <div className="text-xs text-muted">Sent At</div>
               <div className="font-medium text-foreground">{formatDateTime(notification.sent_at ?? notification.created_at)}</div>
            </div>
            <div>
               <div className="text-xs text-muted">Success / Total</div>
               <div className="font-medium text-green-600">{notification.success_count} / {notification.total_recipients}</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
