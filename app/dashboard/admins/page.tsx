"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatabaseBackup, Edit3, Plus, Power, ShieldCheck, Trash2 } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EntityListItem } from "@/components/ui/EntityListItem";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { MetricTile } from "@/components/ui/MetricTile";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/StateBlocks";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { ActivityLogItem, AdminUser } from "@/types/api";

type AdminForm = Partial<AdminUser> & { password: string };

const emptyAdmin: AdminForm = {
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

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.pushToast);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<AdminForm>(emptyAdmin);
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const admins = useQuery({ queryKey: ["admins"], queryFn: endpoints.admins });
  const permissions = useQuery({ queryKey: ["permission-groups"], queryFn: endpoints.permissionGroups });
  const backups = useQuery({ queryKey: ["backups"], queryFn: endpoints.backups });
  const health = useQuery({ queryKey: ["system-health"], queryFn: endpoints.systemHealth });
  const activity = useQuery({ queryKey: ["super-activity-log"], queryFn: endpoints.superActivityLog });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admins"] });
    await queryClient.invalidateQueries({ queryKey: ["backups"] });
    await queryClient.invalidateQueries({ queryKey: ["super-activity-log"] });
    await queryClient.invalidateQueries({ queryKey: ["system-health"] });
  };

  const save = useMutation({
    mutationFn: () => selected ? endpoints.updateAdmin(selected.id, form) : endpoints.addAdmin(form),
    onSuccess: async () => {
      await invalidate();
      setForm(emptyAdmin);
      setSelected(null);
      setOpen(false);
      pushToast({ kind: "success", title: "Admin saved" });
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Save failed", message: getErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => endpoints.removeAdmin(id),
    onSuccess: async () => {
      await invalidate();
      setRemoveTarget(null);
      pushToast({ kind: "success", title: "Admin removed" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Remove failed", message: getErrorMessage(error) }),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => endpoints.deactivateAdmin(id),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Admin deactivated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Deactivate failed", message: getErrorMessage(error) }),
  });

  const assignPermissions = useMutation({
    mutationFn: ({ id, key }: { id: number; key: string }) => endpoints.assignPermissions(id, { [key]: true }),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Permissions assigned" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Permissions failed", message: getErrorMessage(error) }),
  });

  const createBackup = useMutation({
    mutationFn: endpoints.createBackup,
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Backup created" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Backup failed", message: getErrorMessage(error) }),
  });

  const restoreBackup = useMutation({
    mutationFn: (id: string) => endpoints.restoreBackup(id),
    onSuccess: () => pushToast({ kind: "success", title: "Restore accepted" }),
    onError: (error) => pushToast({ kind: "error", title: "Restore failed", message: getErrorMessage(error) }),
  });

  const openAdmin = (admin?: AdminUser) => {
    setSelected(admin ?? null);
    setForm(admin ? { ...admin, password: "" } : emptyAdmin);
    setFieldErrors({});
    setOpen(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    save.mutate();
  };

  const adminColumns: Array<DataTableColumn<AdminUser>> = [
    {
      id: "admin",
      header: "Admin",
      cell: (admin) => (
        <>
          <div className="font-medium">{fullName(admin.first_name, admin.last_name)}</div>
          <div className="text-xs text-muted">@{admin.username}</div>
        </>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: (admin) => (
        <>
          <div>{admin.mobile}</div>
          <div className="text-xs text-muted">{admin.email}</div>
        </>
      ),
    },
    { id: "role", header: "Role", cell: (admin) => <Badge variant={admin.role === "super_admin" ? "info" : "neutral"}>{admin.role.replace("_", " ")}</Badge> },
    { id: "status", header: "Status", cell: (admin) => <Badge variant={statusVariant(admin.is_active ? "active" : "inactive")}>{admin.is_active ? "Active" : "Inactive"}</Badge> },
    { id: "joined", header: "Joined", cell: (admin) => formatDate(admin.date_joined) },
    {
      id: "actions",
      header: "Actions",
      cell: (admin) => {
        const isCurrent = admin.id === currentUser?.id;
        return (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Edit3 className="h-4 w-4" />} onClick={() => openAdmin(admin)}>Edit</Button>
            <Button variant="secondary" size="sm" disabled={isCurrent} loading={deactivate.isPending} icon={<Power className="h-4 w-4" />} onClick={() => deactivate.mutate(admin.id)}>Deactivate</Button>
            <Button variant="danger" size="sm" disabled={isCurrent} loading={remove.isPending} icon={<Trash2 className="h-4 w-4" />} onClick={() => setRemoveTarget(admin)}>Remove</Button>
          </div>
        );
      },
    },
  ];

  const activityColumns: Array<DataTableColumn<ActivityLogItem>> = [
    { id: "action", header: "Action", cell: (item) => item.action },
    { id: "admin", header: "Admin", cell: (item) => item.admin_name },
    { id: "time", header: "Time", cell: (item) => formatDateTime(item.created_at) },
  ];

  return (
    <>
      <PageHeader
        title="Admins"
        eyebrow="Super Admin"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => openAdmin()}>Add Admin</Button>}
      />

      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(health.data ?? {}).map(([key, value]) => (
          <MetricTile key={key} label={key} value={formatHealthValue(value)} size="sm" />
        ))}
      </div>

      <DataTable
        data={admins.data ?? []}
        columns={adminColumns}
        getRowKey={(admin) => admin.id}
        loading={admins.isLoading}
        error={admins.error ? "Unable to load admins." : false}
        emptyTitle="No admins found"
        rowClassName="table-row-hover"
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="surface rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Permissions Snapshot</h2>
            <ShieldCheck className="h-4 w-4 text-muted" />
          </div>
          <div className="grid gap-2">
            {(admins.data ?? []).map((admin) => (
              <div key={admin.id} className="rounded-lg border border-border bg-panel-strong p-3">
                <p className="font-medium">{admin.username}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.keys(admin.permissions || {}).length > 0 ? (
                    Object.keys(admin.permissions || {}).map((key) => (
                      <Badge key={key} variant="info">{key.replace("_", " ")}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted">No permissions.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Backups</h2>
            <Button size="sm" loading={createBackup.isPending} icon={<DatabaseBackup className="h-4 w-4" />} onClick={() => createBackup.mutate()}>Create</Button>
          </div>
          <div className="grid gap-2">
            {(backups.data ?? []).map((backup) => (
              <EntityListItem
                key={backup.id}
                title={backup.id}
                meta={formatDateTime(backup.created_at)}
                actions={<Button size="sm" variant="secondary" loading={restoreBackup.isPending} onClick={() => restoreBackup.mutate(backup.id)}>Restore</Button>}
              />
            ))}
            {(backups.data ?? []).length === 0 ? <EmptyState title="No backups configured" /> : null}
          </div>
        </div>
      </section>

      <section className="surface rounded-lg p-5">
        <h2 className="mb-4 font-semibold">Activity Log</h2>
        <DataTable
          data={(activity.data ?? []).slice(0, 12)}
          columns={activityColumns}
          getRowKey={(item) => item.id}
          loading={activity.isLoading}
          emptyTitle="No activity logged"
          shellClassName="rounded-none border-0 bg-transparent shadow-none"
        />
      </section>

      <Modal open={open} title={selected ? "Edit Admin" : "Add Admin"} onClose={() => setOpen(false)}>
        <FormShell onSubmit={submit}>
          <FormGrid columns={2}>
            <Input label="Username" value={form.username ?? ""} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} error={fieldErrors.username} required />
            <Input label="Mobile" value={form.mobile ?? ""} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} error={fieldErrors.mobile} required />
            <Input label="First Name" value={form.first_name ?? ""} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} error={fieldErrors.first_name} />
            <Input label="Last Name" value={form.last_name ?? ""} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} error={fieldErrors.last_name} />
            <Input label="Email" type="email" value={form.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} error={fieldErrors.email} />
            <Input label={selected ? "New Password" : "Password"} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} error={fieldErrors.password} required={!selected} />
            <Select
              label="Role"
              value={form.role ?? "admin"}
              onChange={(v) => setForm((current) => ({ ...current, role: v as AdminUser["role"] }))}
              disabled={selected?.role === "super_admin"}
              options={[
                { value: "admin", label: "Admin" },
                ...(selected?.role === "super_admin" ? [{ value: "super_admin", label: "Super Admin" }] : []),
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
              {(permissions.data ?? []).map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.permissions?.[perm.key])}
                    disabled={form.role === "super_admin"}
                    onChange={(e) =>
                      setForm((current) => {
                        const newPerms = { ...(current.permissions || {}) };
                        if (e.target.checked) {
                          newPerms[perm.key] = true;
                        } else {
                          delete newPerms[perm.key];
                        }
                        return { ...current, permissions: newPerms };
                      })
                    }
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary bg-panel"
                  />
                  <span className="text-sm select-none">{perm.label}</span>
                </label>
              ))}
              {(permissions.data ?? []).length === 0 ? <span className="text-sm text-muted">No permissions available.</span> : null}
            </div>
          </div>

          <FormActions className="mt-6">
            <Button type="submit" loading={save.isPending} icon={<Plus className="h-4 w-4" />}>Save Admin</Button>
          </FormActions>
        </FormShell>
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove Admin"
        message={removeTarget ? `Remove admin ${removeTarget.username}?` : "Remove this admin?"}
        confirmLabel="Remove"
        loading={remove.isPending}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && remove.mutate(removeTarget.id)}
      />
    </>
  );
}

function formatHealthValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join(", ");
  }
  return String(value);
}
