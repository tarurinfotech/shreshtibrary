"use client";

import { FormEvent, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Save, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormShell } from "@/components/ui/Form";
import { Input, Switch, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

export default function SettingsPage() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const pushToast = useToastStore((state) => state.pushToast);
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = useMutation({
    mutationFn: () =>
      endpoints.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    onSuccess: () => {
      pushToast({ kind: "success", title: "Password changed" });
      clearSession();
      router.replace("/login");
    },
    onError: (error) => pushToast({ kind: "error", title: "Change failed", message: getErrorMessage(error) }),
  });

  const settings = useQuery({ queryKey: ["settings"], queryFn: endpoints.settings });
  
  const [paddingTime, setPaddingTime] = useState("");
  
  // AppConfig State
  const [premiumGating, setPremiumGating] = useState(true);
  const [expiryTitle, setExpiryTitle] = useState("");
  const [expiryMessage, setExpiryMessage] = useState("");
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [allowSliders, setAllowSliders] = useState(true);
  const [allowLibraryInfo, setAllowLibraryInfo] = useState(true);

  const queryClient = useQueryClient();

  const updateSettings = useMutation({
    mutationFn: () =>
      endpoints.updateSettings({
        attendance_padding_time: paddingTime,
        is_premium_gating_enabled: premiumGating,
        expiry_dialog_title: expiryTitle,
        expiry_dialog_message: expiryMessage,
        allow_non_premium_notifications: allowNotifications,
        allow_non_premium_sliders: allowSliders,
        allow_non_premium_library_info: allowLibraryInfo,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      pushToast({ kind: "success", title: "Settings updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) }),
  });

  // Effect to load settings
  useEffect(() => {
    if (settings.data) {
      setPaddingTime(settings.data.attendance_padding_time || "60");
      setPremiumGating(settings.data.is_premium_gating_enabled ?? true);
      setExpiryTitle(settings.data.expiry_dialog_title ?? "Plan Expired");
      setExpiryMessage(settings.data.expiry_dialog_message ?? "Your plan has expired. Please renew to continue using premium features.");
      setAllowNotifications(settings.data.allow_non_premium_notifications ?? true);
      setAllowSliders(settings.data.allow_non_premium_sliders ?? true);
      setAllowLibraryInfo(settings.data.allow_non_premium_library_info ?? true);
    }
  }, [settings.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changePassword.mutate();
  };

  const submitSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateSettings.mutate();
  };

  return (
    <>
      <PageHeader title="Settings" eyebrow="Account" />
      
      <div className="grid gap-6 items-start lg:grid-cols-2 mb-8">
        <FormShell
          surface
          onSubmit={submitSettings}
          actions={
            <Button type="submit" loading={updateSettings.isPending} icon={<Save className="h-4 w-4" />}>
              Save Settings
            </Button>
          }
        >
          <h3 className="font-semibold text-lg border-b pb-2 mb-4">Application Settings</h3>
          <div className="grid gap-6">
            <div className="grid gap-4">
              <h4 className="text-sm font-medium text-muted">Attendance Rules</h4>
              <Input
                label="Attendance Padding Time (Minutes)"
                type="number"
                min="0"
                value={paddingTime}
                onChange={(event) => setPaddingTime(event.target.value)}
                required
              />
            </div>
            
            <div className="grid gap-4">
              <h4 className="text-sm font-medium text-muted flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Premium Access Control
              </h4>
              <div className="rounded-lg border border-border p-4 grid gap-4 bg-panel/50">
                <Switch
                  label="Enable Premium Feature Gating"
                  checked={premiumGating}
                  onChange={(e) => setPremiumGating(e.target.checked)}
                />
                
                {premiumGating && (
                  <div className="grid gap-4 border-t border-border pt-4 mt-2">
                    <p className="text-xs text-muted">Configure Expiry Dialog for Non-Premium Students</p>
                    <Input
                      label="Dialog Title"
                      value={expiryTitle}
                      onChange={(e) => setExpiryTitle(e.target.value)}
                    />
                    <Textarea
                      label="Dialog Message"
                      value={expiryMessage}
                      onChange={(e) => setExpiryMessage(e.target.value)}
                    />
                    
                    <p className="text-xs text-muted mt-2">Allow Non-Premium Access to Specific Features</p>
                    <div className="grid gap-3 pl-2">
                      <Switch
                        label="Promotional Notifications"
                        checked={allowNotifications}
                        onChange={(e) => setAllowNotifications(e.target.checked)}
                      />
                      <Switch
                        label="Home Screen Sliders"
                        checked={allowSliders}
                        onChange={(e) => setAllowSliders(e.target.checked)}
                      />
                      <Switch
                        label="Library Information"
                        checked={allowLibraryInfo}
                        onChange={(e) => setAllowLibraryInfo(e.target.checked)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FormShell>

        <FormShell
          surface
          onSubmit={submit}
          actions={
            <Button type="submit" loading={changePassword.isPending} icon={<Save className="h-4 w-4" />}>
              Change Password
            </Button>
          }
        >
          <h3 className="font-semibold text-lg border-b pb-2 mb-4">Account Security</h3>
          <div className="grid gap-4">
            <Input
              label="Current Password"
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
        </FormShell>
      </div>
    </>
  );
}
