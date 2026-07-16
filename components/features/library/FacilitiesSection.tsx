"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EntityCard } from "@/components/ui/EntityCard";
import { FileInput } from "@/components/ui/FileInput";
import { FormActions, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { mediaUrl } from "@/lib/media";
import { useToastStore } from "@/store/toastStore";
import type { Facility } from "@/types/api";

const emptyFacility: Partial<Facility> = { name: "", icon_key: "", description: "", is_active: true, order: 0 };

interface FacilitiesSectionProps {
  canManageFacilities: boolean;
}

export function FacilitiesSection({ canManageFacilities }: FacilitiesSectionProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [facilityOpen, setFacilityOpen] = useState(false);
  const [facilityForm, setFacilityForm] = useState<Partial<Facility>>(emptyFacility);
  const [facilityImage, setFacilityImage] = useState<File | null>(null);
  const [facilityErrors, setFacilityErrors] = useState<Record<string, string>>({});

  const facilities = useQuery({ queryKey: ["facilities"], queryFn: () => endpoints.facilities() });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["facilities"] });
  };

  const createFacility = useMutation({
    mutationFn: () => endpoints.createFacility(facilityForm, facilityImage),
    onSuccess: async () => {
      await invalidate();
      setFacilityForm(emptyFacility);
      setFacilityImage(null);
      setFacilityOpen(false);
      pushToast({ kind: "success", title: "Facility added" });
    },
    onError: (error) => {
      setFacilityErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Facility failed", message: getErrorMessage(error) });
    },
  });

  const updateFacility = useMutation({
    mutationFn: () => endpoints.updateFacility(facilityForm.id!, facilityForm, facilityImage),
    onSuccess: async () => {
      await invalidate();
      setFacilityForm(emptyFacility);
      setFacilityImage(null);
      setFacilityOpen(false);
      pushToast({ kind: "success", title: "Facility updated" });
    },
    onError: (error) => {
      setFacilityErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) });
    },
  });

  const toggleFacility = useMutation({
    mutationFn: (facility: Facility) => endpoints.toggleFacility(facility.id, !facility.is_active),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Facility updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Toggle failed", message: getErrorMessage(error) }),
  });

  const deleteFacility = useMutation({
    mutationFn: (id: number) => endpoints.deleteFacility(id),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Facility deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  return (
    <>
      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Facilities</h2>
          {canManageFacilities && <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setFacilityForm(emptyFacility); setFacilityImage(null); setFacilityOpen(true); }}>Add</Button>}
        </div>
        {facilities.isLoading ? (
          <div className="py-8 text-center text-sm text-muted">Loading facilities...</div>
        ) : facilities.error ? (
          <div className="py-8 text-center text-sm text-red-500">Failed to load facilities</div>
        ) : facilities.data?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted">No facilities added yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(facilities.data ?? []).map((facility) => (
              <EntityCard
                key={facility.id}
                className="bg-panel-strong"
                avatar={
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 bg-cover bg-center text-primary"
                    style={facility.image ? { backgroundImage: `url(${mediaUrl(facility.image)})` } : undefined}
                    role="img"
                    aria-label={`${facility.name} icon`}
                  >
                    {!facility.image && facility.icon_key ? <span className="text-xl font-bold" aria-hidden="true">{facility.icon_key[0]}</span> : null}
                  </div>
                }
                title={facility.name}
                subtitle={facility.description || facility.icon_key || "No description"}
                badge={<Badge variant={statusVariant(facility.is_active ? "active" : "inactive")}>{facility.is_active ? "Active" : "Inactive"}</Badge>}
                actions={
                  canManageFacilities ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => { setFacilityForm(facility); setFacilityImage(null); setFacilityOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="secondary" loading={toggleFacility.isPending && toggleFacility.variables?.id === facility.id} onClick={() => toggleFacility.mutate(facility)}>
                        {facility.is_active ? "Inactive" : "Active"}
                      </Button>
                      <Button size="sm" variant="danger" loading={deleteFacility.isPending && deleteFacility.variables === facility.id} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={() => deleteFacility.mutate(facility.id)}>Delete</Button>
                    </>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      <Modal open={facilityOpen} title={facilityForm.id ? "Edit Facility" : "Add Facility"} onClose={() => setFacilityOpen(false)}>
        <FormShell onSubmit={(event) => { event.preventDefault(); setFacilityErrors({}); facilityForm.id ? updateFacility.mutate() : createFacility.mutate(); }}>
          <Input label="Name" value={facilityForm.name ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, name: event.target.value }))} error={facilityErrors.name} required />
          <Input label="Icon Key" value={facilityForm.icon_key ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, icon_key: event.target.value }))} error={facilityErrors.icon_key} />
          <div className="flex items-center gap-4">
            {(facilityImage || facilityForm.image) && (
              <div 
                className="h-16 w-16 shrink-0 rounded-lg bg-panel-strong bg-cover bg-center border border-border"
                style={{ backgroundImage: `url(${facilityImage ? URL.createObjectURL(facilityImage) : mediaUrl(facilityForm.image)})` }}
              />
            )}
            <div className="flex-1">
              <FileInput 
                label="Facility Image" 
                accept="image/*" 
                fileName={facilityImage ? `${facilityImage.name} selected` : null}
                onChange={(event) => setFacilityImage(event.target.files?.[0] ?? null)} 
              />
            </div>
          </div>
          <Textarea label="Description" value={facilityForm.description ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, description: event.target.value }))} error={facilityErrors.description} />
          <FormActions><Button type="submit" loading={createFacility.isPending || updateFacility.isPending} icon={<Save className="h-4 w-4" />}>{facilityForm.id ? "Save Changes" : "Add Facility"}</Button></FormActions>
        </FormShell>
      </Modal>
    </>
  );
}
