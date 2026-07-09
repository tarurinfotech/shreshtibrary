/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Save, Clock, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";;
import { PageHeader } from "@/components/ui/PageHeader";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { SectionCard } from "@/components/ui/SectionCard";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const pushToast = useToastStore((state) => state.pushToast);
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({});
  const [smtpErrors, setSmtpErrors] = useState<Record<string, string>>({});
  const [showSmtpPass, setShowSmtpPass] = useState(false);

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
    onError: (error) => {
      setPasswordErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Change failed", message: getErrorMessage(error) });
    },
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
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Brevo Email Settings
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [brevoFromName, setBrevoFromName] = useState("");
  const [brevoFromEmail, setBrevoFromEmail] = useState("");

  // WhatsApp Settings
  const [waBaseUrl, setWaBaseUrl] = useState("");
  const [waSessionId, setWaSessionId] = useState("");
  const [waApiKey, setWaApiKey] = useState("");
  const [enableWhatsappService, setEnableWhatsappService] = useState(false);
  const [waErrors, setWaErrors] = useState<Record<string, string>>({});
  const [showWaApiKey, setShowWaApiKey] = useState(false);

  // Expired Student Permissions (API Paths)
  const [allowProfile, setAllowProfile] = useState(true);
  const [allowPlans, setAllowPlans] = useState(true);
  const [allowPayments, setAllowPayments] = useState(true);
  const [allowLeaderboard, setAllowLeaderboard] = useState(true);
  const [allowNotificationsPaths, setAllowNotificationsPaths] = useState(true);

  const queryClient = useQueryClient();

  const updateSettings = useMutation({
    mutationFn: () => {
      const allowed_paths = ['/api/v1/auth/']; // Auth must always be allowed
      if (allowProfile) allowed_paths.push('/api/v1/student/profile/');
      if (allowPlans) allowed_paths.push('/api/v1/memberships/plans/');
      if (allowPayments) allowed_paths.push('/api/v1/payments/');
      if (allowLeaderboard) allowed_paths.push('/api/v1/study/leaderboard/');
      if (allowNotificationsPaths) allowed_paths.push('/api/v1/notifications/');

      return endpoints.updateSettings({
        attendance_padding_time: paddingTime,
        is_premium_gating_enabled: premiumGating,
        expiry_dialog_title: expiryTitle,
        expiry_dialog_message: expiryMessage,
        allow_non_premium_notifications: allowNotifications,
        allow_non_premium_sliders: allowSliders,
        allow_non_premium_library_info: allowLibraryInfo,
        expired_student_permissions: { allowed_paths },
        enable_whatsapp_service: enableWhatsappService,
        ...(user?.role === "super_admin" ? {
          maintenance_mode: maintenanceMode,
          brevo_api_key: brevoApiKey || undefined,
          brevo_from_name: brevoFromName,
          brevo_from_email: brevoFromEmail,
        } : {})
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      pushToast({ kind: "success", title: "Settings updated" });
    },
    onError: (error) => {
      setSettingsErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) });
    },
  });

  const updateBrevoSettings = useMutation({
    mutationFn: () => {
      return endpoints.updateSettings({
        brevo_api_key: brevoApiKey || undefined,
        brevo_from_name: brevoFromName,
        brevo_from_email: brevoFromEmail,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      pushToast({ kind: "success", title: "Brevo Email Settings updated" });
    },
    onError: (error) => {
      setSmtpErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) });
    },
  });

  const updateWaSettings = useMutation({
    mutationFn: () => {
      return endpoints.updateSettings({
        wa_base_url: waBaseUrl,
        wa_session_id: waSessionId,
        wa_api_key: waApiKey || undefined,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      pushToast({ kind: "success", title: "WhatsApp Settings updated" });
    },
    onError: (error) => {
      setWaErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) });
    },
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
      setEnableWhatsappService(settings.data.enable_whatsapp_service ?? false);
      
      if (user?.role === "super_admin") {
        setMaintenanceMode(settings.data.maintenance_mode ?? false);
        setBrevoApiKey(settings.data.brevo_api_key || "");
        setBrevoFromName(settings.data.brevo_from_name || "");
        setBrevoFromEmail(settings.data.brevo_from_email || "");

        setWaBaseUrl(settings.data.wa_base_url || "");
        setWaSessionId(settings.data.wa_session_id || "");
        setWaApiKey(settings.data.wa_api_key || "");
      }

      const paths = settings.data.expired_student_permissions?.allowed_paths ?? [
        '/api/v1/student/profile/',
        '/api/v1/memberships/plans/',
        '/api/v1/payments/',
        '/api/v1/auth/',
        '/api/v1/study/leaderboard/',
        '/api/v1/notifications/'
      ];
      setAllowProfile(paths.includes('/api/v1/student/profile/'));
      setAllowPlans(paths.includes('/api/v1/memberships/plans/'));
      setAllowPayments(paths.includes('/api/v1/payments/'));
      setAllowLeaderboard(paths.includes('/api/v1/study/leaderboard/'));
      setAllowNotificationsPaths(paths.includes('/api/v1/notifications/'));
    }
  }, [settings.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordErrors({});
    changePassword.mutate();
  };

  const submitSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettingsErrors({});
    updateSettings.mutate();
  };

  const submitBrevoSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSmtpErrors({});
    updateBrevoSettings.mutate();
  };

  const submitWaSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWaErrors({});
    updateWaSettings.mutate();
  };

  return (
    <>
      <PageHeader title="Settings" eyebrow="Account" />
      
      <div className="grid lg:grid-cols-12 gap-8 items-start mb-12">
        
        {/* Left Side Column */}
        <div className="grid gap-8 lg:col-span-4 xl:col-span-3">
          
          <form onSubmit={submit} className="grid gap-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
               <div>
                  <h2 className="text-lg font-semibold">Account Security</h2>
                  <p className="text-sm text-muted mt-1">Update your administrator password.</p>
               </div>
            </div>
            
            <SectionCard title="Update Password" eyebrow="Authentication">
               <div className="grid gap-5 mt-2">
                   <Input label="Current Password" type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} error={passwordErrors.old_password} required />
                   <Input label="New Password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} error={passwordErrors.new_password} required />
                   <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} error={passwordErrors.confirm_password} required />
                   
                   <div className="pt-2 border-t border-border mt-2">
                     <Button type="submit" loading={changePassword.isPending} icon={<Save className="h-4 w-4" />} className="w-full">
                       Change Password
                     </Button>
                   </div>
               </div>
            </SectionCard>
          </form>

          <form onSubmit={submitSettings} className="grid gap-6">
             <SectionCard title="Attendance Rules" eyebrow="Core">
                 <div className="grid gap-4 mt-2">
                   <Input
                     label="Attendance Padding Time (Minutes)"
                     type="number"
                     min="0"
                     value={paddingTime}
                     onChange={(event) => setPaddingTime(event.target.value)}
                     error={settingsErrors.attendance_padding_time}
                     required
                   />
                   <p className="text-xs text-muted">Time allowed for students to check out before or after their session bounds.</p>
                 </div>
                 <div className="pt-4 border-t border-border mt-4">
                   <Button type="submit" loading={updateSettings.isPending} icon={<Save className="h-4 w-4" />} className="w-full">
                     Save Settings
                   </Button>
                 </div>
             </SectionCard>
          </form>
        </div>

        {/* Right Side Column */}
        <form onSubmit={submitSettings} className="grid gap-6 lg:col-span-8 xl:col-span-9">
          <div className="flex items-center justify-between border-b border-border pb-4">
             <div>
                <h2 className="text-lg font-semibold">Application Settings</h2>
                <p className="text-sm text-muted mt-1">Configure global application behavior and permissions.</p>
             </div>
             <Button type="submit" loading={updateSettings.isPending} icon={<Save className="h-4 w-4" />}>
               Save Settings
             </Button>
          </div>
          
          <div className="grid xl:grid-cols-2 gap-6 items-start">
             
             <SectionCard title="API View Permissions" eyebrow="Security" className="h-full">
                <p className="text-sm text-muted mb-5">Select which backend features are accessible to Suspended or Expired students.</p>
                <div className="grid sm:grid-cols-2 gap-6">
                    <Switch label="Profile Access" checked={allowProfile} onChange={(e) => setAllowProfile(e.target.checked)} />
                    <Switch label="Plans & Memberships" checked={allowPlans} onChange={(e) => setAllowPlans(e.target.checked)} />
                    <Switch label="Payments & Transactions" checked={allowPayments} onChange={(e) => setAllowPayments(e.target.checked)} />
                    <Switch label="Leaderboard Access" checked={allowLeaderboard} onChange={(e) => setAllowLeaderboard(e.target.checked)} />
                    <Switch label="Notifications History" checked={allowNotificationsPaths} onChange={(e) => setAllowNotificationsPaths(e.target.checked)} />
                </div>
             </SectionCard>

             <SectionCard title="Communication Features" eyebrow="Integration" className="h-full">
                <p className="text-sm text-muted mb-5">Enable or disable third-party integrations.</p>
                <div className="grid gap-6">
                    <Switch label="Enable WhatsApp Service" checked={enableWhatsappService} onChange={(e) => setEnableWhatsappService(e.target.checked)} />
                </div>
             </SectionCard>

             <SectionCard 
                 title="Premium Access Control" 
                 eyebrow="Monetization" 
                 className="h-full"
                 actions={<Switch checked={premiumGating} onChange={(e) => setPremiumGating(e.target.checked)} />}
             >
                 {premiumGating ? (
                    <div className="grid gap-4 mt-2">
                        <Input
                          label="Expiry Dialog Title"
                          value={expiryTitle}
                          onChange={(e) => setExpiryTitle(e.target.value)}
                          error={settingsErrors.expiry_dialog_title}
                        />
                        <Textarea
                          label="Expiry Dialog Message"
                          value={expiryMessage}
                          onChange={(e) => setExpiryMessage(e.target.value)}
                          error={settingsErrors.expiry_dialog_message}
                          rows={2}
                        />
                        
                        <div className="border-t border-border pt-4 mt-2">
                          <p className="text-xs font-semibold uppercase text-muted mb-3">Allow Non-Premium Access To:</p>
                          <div className="grid gap-3">
                            <Switch label="Promotional Notifications" checked={allowNotifications} onChange={(e) => setAllowNotifications(e.target.checked)} />
                            <Switch label="Home Screen Sliders" checked={allowSliders} onChange={(e) => setAllowSliders(e.target.checked)} />
                            <Switch label="Library Information" checked={allowLibraryInfo} onChange={(e) => setAllowLibraryInfo(e.target.checked)} />
                          </div>
                        </div>
                    </div>
                 ) : (
                    <div className="mt-4 rounded-lg bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
                      <p className="text-sm font-medium">Premium gating is currently disabled.</p>
                      <p className="text-xs mt-1 opacity-80">All students have full unrestricted access to the application regardless of their active plan status.</p>
                    </div>
                 )}
             </SectionCard>
          </div>
        </form>

        {user?.role === "super_admin" && (
          <>
           <form onSubmit={submitBrevoSettings} className="lg:col-span-12">
             <SectionCard 
               title="Brevo Email Settings" 
               eyebrow="Super Admin Only" 
               className="border-purple-500/30"
             >
               <p className="text-sm text-muted mb-5">Configure the global mail server used to send Welcome emails, OTPs, and Password Reset links via Brevo HTTP API.</p>
               <div className="grid sm:grid-cols-2 gap-6">
                 <div className="relative col-span-1 sm:col-span-2">
                   <Input 
                     label="Brevo API Key" 
                     type={showSmtpPass ? "text" : "password"} 
                     value={brevoApiKey} 
                     onChange={(e) => setBrevoApiKey(e.target.value)} 
                     placeholder="xkeysib-..." 
                     error={smtpErrors.brevo_api_key} 
                   />
                   <button
                     type="button"
                     className="absolute right-3 top-[32px] text-muted hover:text-foreground transition-colors"
                     onClick={() => setShowSmtpPass(!showSmtpPass)}
                     aria-label={showSmtpPass ? "Hide API Key" : "Show API Key"}
                   >
                     {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                   </button>
                 </div>

                 <Input label="From Name" value={brevoFromName} onChange={(e) => setBrevoFromName(e.target.value)} placeholder="Shresht Library" error={smtpErrors.brevo_from_name} />
                 <Input label="From Email" value={brevoFromEmail} onChange={(e) => setBrevoFromEmail(e.target.value)} placeholder="no-reply@shreshtlibrary.com" error={smtpErrors.brevo_from_email} />
               </div>
               
               <div className="pt-4 border-t border-border mt-6 flex justify-end">
                 <Button type="submit" loading={updateBrevoSettings.isPending} icon={<Save className="h-4 w-4" />}>
                   Save Email Settings
                 </Button>
               </div>
             </SectionCard>
           </form>
           
           <form onSubmit={submitWaSettings} className="lg:col-span-12 mt-6">
             <SectionCard 
               title="WhatsApp API Settings" 
               eyebrow="Super Admin Only" 
               className="border-green-500/30"
             >
               <p className="text-sm text-muted mb-5">Configure the WhatsApp API server details used for sending OTPs and notifications.</p>
               <div className="grid sm:grid-cols-2 gap-6">
                 <Input label="Base URL" value={waBaseUrl} onChange={(e) => setWaBaseUrl(e.target.value)} placeholder="https://shreshtlibrarywa.onrender.com" error={waErrors.wa_base_url} className="col-span-1 sm:col-span-2" />
                 <Input label="Session ID" value={waSessionId} onChange={(e) => setWaSessionId(e.target.value)} placeholder="de0f1671-d69b-4e35-ba62-23330e792fcc" error={waErrors.wa_session_id} />
                 
                 <div className="relative">
                   <Input 
                     label="API Key" 
                     type={showWaApiKey ? "text" : "password"} 
                     value={waApiKey} 
                     onChange={(e) => setWaApiKey(e.target.value)} 
                     placeholder="API Key" 
                     error={waErrors.wa_api_key} 
                   />
                   <button
                     type="button"
                     className="absolute right-3 top-[32px] text-muted hover:text-foreground transition-colors"
                     onClick={() => setShowWaApiKey(!showWaApiKey)}
                     aria-label={showWaApiKey ? "Hide API key" : "Show API key"}
                   >
                     {showWaApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                   </button>
                 </div>
               </div>
               
               <div className="pt-4 border-t border-border mt-6 flex justify-end">
                 <Button type="submit" loading={updateWaSettings.isPending} icon={<Save className="h-4 w-4" />}>
                   Save WhatsApp Settings
                 </Button>
               </div>
             </SectionCard>
           </form>

           <form onSubmit={submitSettings} className="lg:col-span-12 mt-6">
             <SectionCard 
               title="App Maintenance" 
               eyebrow="Super Admin Only" 
               className="border-red-500/30"
             >
               <p className="text-sm text-muted mb-5">Enable maintenance mode to temporarily block student access. A maintenance screen will be shown instead of the app.</p>
               <div className="grid sm:grid-cols-2 gap-6">
                 <Switch label="Enable Maintenance Mode" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
               </div>
               
               <div className="pt-4 border-t border-border mt-6 flex justify-end">
                 <Button type="submit" loading={updateSettings.isPending} icon={<Save className="h-4 w-4" />}>
                   Save Maintenance Settings
                 </Button>
               </div>
             </SectionCard>
           </form>
          </>
         )}
      </div>
    </>
  );
}

