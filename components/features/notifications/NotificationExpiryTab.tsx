"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";

export function NotificationExpiryTab() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [expiryTitle, setExpiryTitle] = useState("");
  const [expiryMessage, setExpiryMessage] = useState("");

  const settings = useQuery({ queryKey: ["settings"], queryFn: endpoints.settings });

  useEffect(() => {
    if (settings.data) {
      setExpiryTitle(settings.data.expiry_dialog_title || "Plan Expired");
      setExpiryMessage(settings.data.expiry_dialog_message || "Your plan has expired.");
    }
  }, [settings.data]);

  const updateSettings = useMutation({
    mutationFn: () => endpoints.updateSettings({ ...settings.data, expiry_dialog_title: expiryTitle, expiry_dialog_message: expiryMessage }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      pushToast({ kind: "success", title: "Template updated successfully" });
    },
    onError: (e) => pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(e) }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateSettings.mutate();
      }}
      className="space-y-5"
    >
      <div className="bg-panel rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5 border-b border-border pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Plan Expiry Message</h3>
            <p className="text-sm text-muted">Customize the locked-screen message for expired users.</p>
          </div>
        </div>

        <div className="space-y-5">
          <Input
            label="Dialog Title"
            value={expiryTitle}
            onChange={(e) => setExpiryTitle(e.target.value)}
            required
            placeholder="e.g. Plan Expired"
          />
          <Textarea
            label="Dialog Message"
            value={expiryMessage}
            onChange={(e) => setExpiryMessage(e.target.value)}
            rows={4}
            required
            placeholder="e.g. Your premium plan has expired. Please renew..."
          />
          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" loading={updateSettings.isPending}>
              Save Expiry Settings
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
