"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CalendarDays, Camera, CheckCircle2, KeyRound, Save, ShieldCheck, Upload, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";;
import { MetricTile } from "@/components/ui/MetricTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { AdminProfile } from "@/types/api";

export default function AdminProfilePage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState<Partial<AdminProfile>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [profileImage, setProfileImage] = useState<File | null>(null);

  const profile = useQuery({ queryKey: ["admin-profile"], queryFn: endpoints.adminProfile });

  const update = useMutation({
    mutationFn: () => endpoints.updateAdminProfile(form, profileImage),
    onSuccess: (updated) => {
      setForm({});
      setProfileImage(null);
      setUser(updated);
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      pushToast({ kind: "success", title: "Profile updated" });
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Profile update failed", message: getErrorMessage(error) });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    update.mutate();
  };

  if (profile.isLoading) {
    return <LoadingBlock label="Loading profile" />;
  }

  if (profile.error || !profile.data) {
    return <ErrorState message="Unable to load admin profile." />;
  }

  const displayName = [profile.data.first_name, profile.data.last_name].filter(Boolean).join(" ") || profile.data.username;
  const permissionCount = Object.keys(profile.data.permissions ?? {}).length;

  return (
    <>
      <PageHeader
        title="Admin Profile"
        eyebrow="Account"
        actions={
          <Link href="/dashboard/settings" className={buttonClasses({ variant: "secondary" })}>
            <KeyRound className="h-4 w-4" />
            Password
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="surface rounded-lg p-5">
          <div className="flex flex-col items-center text-center">
            <Avatar
              src={profile.data.profile_image}
              name={displayName}
              size="2xl"
              shape="circle"
              asBackground
            />
            <h2 className="mt-4 text-xl font-semibold">{displayName}</h2>
            <p className="mt-1 text-sm text-muted">@{profile.data.username}</p>
            <Badge variant={profile.data.role === "super_admin" ? "info" : "neutral"}>{profile.data.role.replace("_", " ")}</Badge>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-panel-strong p-3">
            <FileInput
              accept="image/*"
              label="Profile Image"
              fileName={profileImage ? `${profileImage.name} selected` : null}
              helper="Image is compressed when saved."
              onChange={(event) => setProfileImage(event.target.files?.[0] ?? null)}
            />
          </div>

          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-muted">Joined</dt>
              <dd className="mt-1">{formatDate(profile.data.date_joined)}</dd>
            </div>
            <div>
              <dt className="text-muted">Last Login</dt>
              <dd className="mt-1">{formatDateTime(profile.data.last_login)}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd className="mt-1">{profile.data.is_active ? "Active" : "Inactive"}</dd>
            </div>
          </dl>
        </aside>

        <div className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            <MetricTile icon={<Activity className="h-5 w-5" />} label="Activity" value={profile.data.activity_count ?? 0} tone="sky" size="sm" />
            <MetricTile icon={<CheckCircle2 className="h-5 w-5" />} label="Payments Verified" value={profile.data.verified_payments_count ?? 0} tone="emerald" size="sm" />
            <MetricTile icon={<CalendarDays className="h-5 w-5" />} label="Attendance Marked" value={profile.data.marked_attendance_count ?? 0} tone="amber" size="sm" />
            <MetricTile icon={<ShieldCheck className="h-5 w-5" />} label="Permissions" value={permissionCount} tone="violet" size="sm" />
          </div>

          <FormShell surface onSubmit={submit}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Camera className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold">Profile Details</h2>
                <p className="text-sm text-muted">Update your visible admin information.</p>
              </div>
            </div>
            <FormGrid columns={2}>
              <Input label="First Name" value={form.first_name ?? profile.data.first_name ?? ""} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} error={fieldErrors.first_name} />
              <Input label="Last Name" value={form.last_name ?? profile.data.last_name ?? ""} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} error={fieldErrors.last_name} />
              <Input label="Email" type="email" value={form.email ?? profile.data.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} error={fieldErrors.email} />
              <Input label="Mobile" value={form.mobile ?? profile.data.mobile ?? ""} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} error={fieldErrors.mobile} />
            </FormGrid>
            <FormActions>
              <Button type="submit" loading={update.isPending} icon={profileImage ? <Upload className="h-4 w-4" /> : <Save className="h-4 w-4" />}>
                Save Profile
              </Button>
            </FormActions>
          </FormShell>

          <section className="surface rounded-lg p-5">
            <h2 className="font-semibold">Permission Summary</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(profile.data.permissions ?? {}).length > 0 ? (
                Object.keys(profile.data.permissions ?? {}).map((key) => <Badge key={key} variant="info">{key}</Badge>)
              ) : (
                <p className="text-sm text-muted">No custom permission groups assigned.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
