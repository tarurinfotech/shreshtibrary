/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
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
  permissions: [],
  password: "",
};

interface PermissionGroup {
  category: string;
  permissions: string[];
}

interface AdminEditFormProps {
  open: boolean;
  admin: AdminUser | null;
  onClose: () => void;
}

export function AdminEditForm({ open, admin, onClose }: AdminEditFormProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const currentUser = useAuthStore((state) => state.user);
  
  const [form, setForm] = useState<AdminFormPayload>(emptyAdmin);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const permissionsQuery = useQuery<PermissionGroup[]>({ queryKey: ["permission-groups"], queryFn: endpoints.permissionGroups as any });
  
  const permissionsData = permissionsQuery.data ?? [];

  useEffect(() => {
    if (admin) {
      setForm({ ...admin, permissions: Array.isArray(admin.permissions) ? admin.permissions : [], password: "" });
    } else {
      setForm(emptyAdmin);
    }
    setFieldErrors({});
    
    // Auto-expand first few categories or based on search
    if (permissionsData.length > 0 && Object.keys(expandedCategories).length === 0) {
       const initialExpanded: Record<string, boolean> = {};
       permissionsData.slice(0, 3).forEach(g => initialExpanded[g.category] = true);
       setExpandedCategories(initialExpanded);
    }
  }, [admin, open, permissionsData.length]);

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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const togglePermission = (perm: string, checked: boolean) => {
    setForm(current => {
      const perms = Array.isArray(current.permissions) ? [...current.permissions] : [];
      if (checked) {
        if (!perms.includes(perm)) perms.push(perm);
      } else {
        const index = perms.indexOf(perm);
        if (index > -1) perms.splice(index, 1);
      }
      return { ...current, permissions: perms };
    });
  };

  const toggleCategoryAll = (categoryPerms: string[], checked: boolean) => {
    setForm(current => {
      let perms = Array.isArray(current.permissions) ? [...current.permissions] : [];
      if (checked) {
        categoryPerms.forEach(p => {
          if (!perms.includes(p)) perms.push(p);
        });
      } else {
        perms = perms.filter(p => !categoryPerms.includes(p));
      }
      return { ...current, permissions: perms };
    });
  };

  const isSuperAdmin = form.role === "super_admin" || form.role === "sub_super_admin";
  const currentUserRole = currentUser?.role;

  // Filter groups based on search
  const filteredGroups = permissionsData.map(group => {
    const safePermissions = group.permissions ?? [];
    const safeCategory = group.category ?? "";
    if (!searchQuery) return { ...group, permissions: safePermissions, category: safeCategory };
    const lowerQuery = searchQuery.toLowerCase();
    const matchCat = safeCategory.toLowerCase().includes(lowerQuery);
    const matchedPerms = safePermissions.filter(p => p.toLowerCase().includes(lowerQuery));
    if (matchCat || matchedPerms.length > 0) {
      return {
        ...group,
        category: safeCategory,
        permissions: matchCat ? safePermissions : matchedPerms
      };
    }
    return null;
  }).filter(Boolean) as PermissionGroup[];

  const roleOptions = [
    { value: "admin", label: "Admin" },
  ];
  if (currentUserRole === "super_admin") {
    roleOptions.push({ value: "sub_super_admin", label: "Sub Super Admin" });
    roleOptions.push({ value: "super_admin", label: "Super Admin" });
  }

  return (
    <Modal open={open} title={admin ? "Edit Admin" : "Add Admin"} onClose={onClose} size="lg">
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
            onChange={(v) => setForm((current) => ({ ...current, role: v as AdminUser["role"], permissions: [] }))}
            disabled={currentUserRole === "sub_super_admin" || admin?.role === "super_admin"}
            options={roleOptions}
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
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Permission Assignment</h3>
              <p className="text-sm text-muted">Assign granular access control to this account.</p>
            </div>
            <Input 
               label=""
               placeholder="Search permissions..." 
               value={searchQuery}
               onChange={(e) => {
                 setSearchQuery(e.target.value);
                 if (e.target.value) {
                    const allExpanded: Record<string, boolean> = {};
                    permissionsData.forEach(g => allExpanded[g.category] = true);
                    setExpandedCategories(allExpanded);
                 }
               }}
               className="max-w-xs"
            />
          </div>
          
          {isSuperAdmin ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
              <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-primary">Full Access Granted</p>
              <p className="text-sm text-muted">Super Admins and Sub Super Admins automatically inherit all system permissions. No manual assignment required.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredGroups.map((group) => {
                const isExpanded = expandedCategories[group.category];
                const formPerms = Array.isArray(form.permissions) ? form.permissions : [];
                const allChecked = group.permissions.length > 0 && group.permissions.every(p => formPerms.includes(p));
                const someChecked = group.permissions.some(p => formPerms.includes(p));
                
                return (
                  <div key={group.category} className="rounded-lg border border-border bg-panel-strong overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 bg-panel hover:bg-panel-hover cursor-pointer select-none"
                      onClick={() => toggleCategory(group.category)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted" /> : <ChevronRight className="h-4 w-4 text-muted" />}
                        <span className="font-medium">{group.category}</span>
                        {someChecked && !allChecked && <span className="flex h-2 w-2 rounded-full bg-primary ml-2"></span>}
                        {allChecked && <span className="flex h-2 w-2 rounded-full bg-success ml-2"></span>}
                      </div>
                      <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted">
                          <input 
                             type="checkbox" 
                             checked={allChecked} 
                             ref={input => { if (input) input.indeterminate = someChecked && !allChecked; }}
                             onChange={(e) => toggleCategoryAll(group.permissions, e.target.checked)}
                             className="h-4 w-4 rounded border-input text-primary focus:ring-primary bg-panel"
                          />
                          Select All
                        </label>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 bg-panel-strong border-t border-border">
                        {group.permissions.map((perm) => {
                           const actionName = perm.split('.').pop() || perm;
                           return (
                             <label key={perm} className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors group">
                               <input
                                 type="checkbox"
                                 checked={formPerms.includes(perm)}
                                 onChange={(e) => togglePermission(perm, e.target.checked)}
                                 className="h-4 w-4 rounded border-input text-primary focus:ring-primary bg-panel group-hover:border-primary"
                               />
                               <span className="text-sm select-none text-muted-foreground group-hover:text-foreground">{actionName}</span>
                             </label>
                           );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredGroups.length === 0 && (
                <div className="text-center p-8 text-muted border border-dashed border-border rounded-lg">
                  No permissions match your search.
                </div>
              )}
            </div>
          )}
        </div>

        <FormActions className="mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending} icon={<Plus className="h-4 w-4" />}>
            Save Admin
          </Button>
        </FormActions>
      </FormShell>
    </Modal>
  );
}

