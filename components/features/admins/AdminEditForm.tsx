"use client";

import { FormEvent, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";
import type { AdminUser } from "@/types/api";

export type AdminFormPayload = Partial<AdminUser> & { password?: string };

const emptyAdmin: AdminFormPayload = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  role: "admin",
  is_active: true,
  permissions: {},
  password: "",
};

interface AdminEditFormProps {
  open: boolean;
  admin: AdminUser | null;
  onClose: () => void;
}

export function AdminEditForm({ open, admin, onClose }: AdminEditFormProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [form, setForm] = useState<AdminFormPayload>(emptyAdmin);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const permissions = useQuery({ queryKey: ["permission-groups"], queryFn: endpoints.permissionGroups });

  useEffect(() => {
    if (admin) {
      setForm({ ...admin, password: "" });
    } else {
      setForm(emptyAdmin);
    }
    setFieldErrors({});
  }, [admin, open]);

  const save = useMutation({
    mutationFn: () => admin ? endpoints.updateAdmin(admin.id, form) : endpoints.addAdmin({ ...form, password: form.password || "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      queryClient.invalidateQueries({ queryKey: ["super-activity-log"] });
      onClose();
      pushToast({ kind: "success", title: "Admin saved" });
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Save failed", message: getErrorMessage(error) });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    save.mutate();
  };

  return (
    <Modal open={open} title={admin ? "Edit Admin" : "Add Admin"} onClose={onClose}>
      <FormShell onSubmit={submit}>
        <FormGrid columns={2}>
          <Input 
            label="Username" 
            value={form.username ?? ""} 
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} 
            error={fieldErrors.username} 
            required 
          />
          <Input 
            label="Mobile" 
            value={form.mobile ?? ""} 
            onChange={(event) => {
              const val = event.target.value.replace(/\D/g, "").slice(0, 10);
              setForm((current) => ({ ...current, mobile: val }));
            }} 
            error={fieldErrors.mobile} 
            maxLength={10}
            required 
          />
          <Input 
            label="First Name" 
            value={form.first_name ?? ""} 
            onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} 
            error={fieldErrors.first_name} 
          />
          <Input 
            label="Last Name" 
            value={form.last_name ?? ""} 
            onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} 
            error={fieldErrors.last_name} 
          />
          <Input 
            label="Email" 
            type="email" 
            value={form.email ?? ""} 
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} 
            error={fieldErrors.email} 
          />
          <Input 
            label={admin ? "New Password" : "Password"} 
            type="password" 
            value={form.password || ""} 
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} 
            error={fieldErrors.password} 
            required={!admin} 
          />
          <Select
            label="Role"
            value={form.role ?? "admin"}
            onChange={(v) => setForm((current) => ({ ...current, role: v as AdminUser["role"] }))}
            disabled={admin?.role === "super_admin"}
            options={[
              { value: "admin", label: "Admin" },
              ...(admin?.role === "super_admin" ? [{ value: "super_admin", label: "Super Admin" }] : []),
            ]}
          />
          <Select
            label="Status"
            value={form.is_active ? "active" : "inactive"}
            onChange={(v) => setForm((current) => ({ ...current, is_active: v === "active" }))}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </FormGrid>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="mb-3 font-semibold text-sm">Assign Permissions</h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {(permissions.data ?? []).map((perm) => {
              const isChecked = form.role === "super_admin" || (form.permissions && typeof form.permissions === "object" && !Array.isArray(form.permissions) 
                ? Boolean(form.permissions[perm.key as keyof typeof form.permissions]) 
                : false);
              
              return (
                <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={form.role === "super_admin"}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((current) => {
                        const currentPerms = current.permissions && typeof current.permissions === "object" && !Array.isArray(current.permissions) 
                          ? current.permissions 
                          : {};
                        const newPerms = { ...currentPerms };
                        if (checked) {
                          newPerms[perm.key as keyof typeof newPerms] = true;
                        } else {
                          delete newPerms[perm.key as keyof typeof newPerms];
                        }
                        return { ...current, permissions: newPerms };
                      });
                    }}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary bg-panel"
                  />
                  <span className="text-sm select-none">{perm.label}</span>
                </label>
              );
            })}
            {(permissions.data ?? []).length === 0 ? <span className="text-sm text-muted">No permissions available.</span> : null}
          </div>
        </div>

        <FormActions className="mt-6">
          <Button type="submit" loading={save.isPending} icon={<Plus className="h-4 w-4" />}>
            Save Admin
          </Button>
        </FormActions>
      </FormShell>
    </Modal>
  );
}
