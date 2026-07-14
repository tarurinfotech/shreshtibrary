"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatabaseBackup, Edit3, Plus, Power, ShieldCheck, Trash2 } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EntityListItem } from "@/components/ui/EntityListItem";
import { MetricTile } from "@/components/ui/MetricTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/StateBlocks";
import { getErrorMessage } from "@/lib/api";
import { API_BASE_URL } from "@/lib/baseApi";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { ActivityLogItem, AdminUser } from "@/types/api";
import { AdminEditForm } from "@/components/features/admins/AdminEditForm";

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.pushToast);

  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key);
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };

  const canCreate = hasPerm("AdminManagement.Create");
  const canEdit = hasPerm("AdminManagement.Edit");
  const canDelete = hasPerm("AdminManagement.Delete");
  const canSuspend = hasPerm("AdminManagement.Suspend");
  const canBackupCreate = hasPerm("Backup.Create");
  const canBackupRestore = hasPerm("Backup.Restore");
  const canBackupDownload = hasPerm("Backup.Download");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);

  const admins = useQuery({ queryKey: ["admins"], queryFn: endpoints.admins });
  const backups = useQuery({ queryKey: ["backups"], queryFn: endpoints.backups });
  const health = useQuery({ queryKey: ["system-health"], queryFn: endpoints.systemHealth });
  const activity = useQuery({ queryKey: ["super-activity-log"], queryFn: endpoints.superActivityLog });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admins"] });
    queryClient.invalidateQueries({ queryKey: ["backups"] });
    queryClient.invalidateQueries({ queryKey: ["super-activity-log"] });
    queryClient.invalidateQueries({ queryKey: ["system-health"] });
  };

  const remove = useMutation({
    mutationFn: (id: number) => endpoints.removeAdmin(id),
    onSuccess: () => {
      invalidate();
      setRemoveTarget(null);
      pushToast({ kind: "success", title: "Admin removed" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Remove failed", message: getErrorMessage(error) }),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => endpoints.deactivateAdmin(id),
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Admin deactivated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Deactivate failed", message: getErrorMessage(error) }),
  });

  const createBackup = useMutation({
    mutationFn: endpoints.createBackup,
    onSuccess: () => {
      invalidate();
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
    setOpen(true);
  };

  const adminColumns: Array<DataTableColumn<AdminUser>> = [
    {
      id: "admin",
      header: "Admin",
      cell: (admin) => (
        <>
          <div className="font-medium">{fullName(admin?.first_name, admin?.last_name, admin?.username)}</div>
          <div className="text-xs text-muted">@{admin?.username}</div>
        </>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: (admin) => (
        <>
          <div>{admin?.mobile}</div>
          <div className="text-xs text-muted">{admin?.email}</div>
        </>
      ),
    },
    { id: "role", header: "Role", cell: (admin) => <Badge variant={admin?.role === "super_admin" ? "info" : "neutral"}>{admin?.role?.replace("_", " ") ?? "Admin"}</Badge> },
    { id: "status", header: "Status", cell: (admin) => <Badge variant={statusVariant(admin?.is_active ? "active" : "inactive")}>{admin?.is_active ? "Active" : "Inactive"}</Badge> },
    { id: "joined", header: "Joined", cell: (admin) => formatDate(admin?.date_joined) },
    {
      id: "actions",
      header: "Actions",
      cell: (admin) => {
        const isCurrent = admin?.id === currentUser?.id;
        return (
          <div className="flex flex-wrap gap-2">
            {canEdit && <Button variant="secondary" size="sm" icon={<Edit3 className="h-4 w-4" />} onClick={() => openAdmin(admin)}>Edit</Button>}
            {canSuspend && <Button variant="secondary" size="sm" disabled={isCurrent} loading={deactivate.isPending} icon={<Power className="h-4 w-4" />} onClick={() => deactivate.mutate(admin?.id)}>Deactivate</Button>}
            {canDelete && <Button variant="danger" size="sm" disabled={isCurrent} loading={remove.isPending} icon={<Trash2 className="h-4 w-4" />} onClick={() => setRemoveTarget(admin)}>Remove</Button>}
          </div>
        );
      },
    },
  ];

  const activityColumns: Array<DataTableColumn<ActivityLogItem>> = [
    { id: "action", header: "Action", cell: (item) => item?.action ?? "Unknown" },
    { id: "admin", header: "Admin", cell: (item) => item?.admin_name ?? "System" },
    { id: "time", header: "Time", cell: (item) => formatDateTime(item?.created_at) },
  ];

  return (
    <>
      <PageHeader
        title="Admins"
        eyebrow="Super Admin"
        actions={canCreate ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => openAdmin()}>Add Admin</Button> : undefined}
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
        rowClassName="hover:bg-table-row-hover transition-colors"
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="surface rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Permissions Snapshot</h2>
            <ShieldCheck className="h-4 w-4 text-muted" />
          </div>
          <div className="grid gap-2">
            {(admins.data ?? []).map((admin) => (
              <div key={admin?.id ?? Math.random()} className="rounded-lg border border-border bg-panel-strong p-3">
                <p className="font-medium">{admin?.username ?? "Unknown Admin"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.isArray(admin?.permissions) && (admin?.permissions ?? []).length > 0 ? (
                    (admin?.permissions ?? []).map((key) => (
                      <Badge key={key} variant="info">{key}</Badge>
                    ))
                  ) : admin?.role === "super_admin" || admin?.role === "sub_super_admin" ? (
                    <Badge variant="success">All Permissions</Badge>
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
            {canBackupCreate && <Button size="sm" loading={createBackup.isPending} icon={<DatabaseBackup className="h-4 w-4" />} onClick={() => createBackup.mutate()}>Create</Button>}
          </div>
          <div className="grid gap-2">
            {(backups.data ?? []).map((backup) => (
              <EntityListItem
                key={backup.id}
                title={backup.id}
                meta={formatDateTime(backup.created_at)}
                actions={
                  <div className="flex gap-2">
                    {canBackupRestore && <Button size="sm" variant="secondary" loading={restoreBackup.isPending && restoreBackup.variables === backup.id} onClick={() => restoreBackup.mutate(backup.id)}>Restore</Button>}
                    {canBackupDownload && (
                      <a href={`${API_BASE_URL}/superadmin/backup/${backup.id}/download`} download>
                        <Button size="sm" variant="secondary" className="px-3" icon={<DatabaseBackup className="h-4 w-4" />}>Download</Button>
                      </a>
                    )}
                  </div>
                }
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

      <AdminEditForm open={open} admin={selected} onClose={() => setOpen(false)} />

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
