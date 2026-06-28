"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Save, Star, Trash2, Trophy } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { EntityCard } from "@/components/ui/EntityCard";
import { Button } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { useToastStore } from "@/store/toastStore";
import type { Achiever, Facility, LibraryInfo } from "@/types/api";

const emptyFacility: Partial<Facility> = { name: "", icon_key: "", description: "", is_active: true, order: 0 };
const emptyAchiever: Partial<Achiever> = { name: "", goal: "", achievement: "", year: new Date().getFullYear(), is_featured: false, is_active: true, order: 0 };

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const info = useQuery({ queryKey: ["library-info"], queryFn: endpoints.libraryInfo });
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: endpoints.facilities });
  const achievers = useQuery({ queryKey: ["achievers"], queryFn: endpoints.achievers });
  const reviews = useQuery({ queryKey: ["public-reviews"], queryFn: endpoints.publicReviews });
  const reviewSummary = useQuery({ queryKey: ["review-summary"], queryFn: endpoints.reviewSummary });
  const [infoForm, setInfoForm] = useState<Partial<LibraryInfo>>({});
  const [featureImage, setFeatureImage] = useState<File | null>(null);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [facilityForm, setFacilityForm] = useState<Partial<Facility>>(emptyFacility);
  const [facilityImage, setFacilityImage] = useState<File | null>(null);
  const [achieverOpen, setAchieverOpen] = useState(false);
  const [achieverForm, setAchieverForm] = useState<Partial<Achiever>>(emptyAchiever);
  const [achieverPhoto, setAchieverPhoto] = useState<File | null>(null);
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
  const [facilityErrors, setFacilityErrors] = useState<Record<string, string>>({});
  const [achieverErrors, setAchieverErrors] = useState<Record<string, string>>({});

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["library-info"] });
    await queryClient.invalidateQueries({ queryKey: ["facilities"] });
    await queryClient.invalidateQueries({ queryKey: ["achievers"] });
    await queryClient.invalidateQueries({ queryKey: ["public-reviews"] });
  };

  const saveInfo = useMutation({
    mutationFn: () => endpoints.updateLibraryInfo({ ...info.data, ...infoForm }, featureImage),
    onSuccess: async () => {
      await invalidate();
      setFeatureImage(null);
      pushToast({ kind: "success", title: "Library info saved" });
    },
    onError: (error) => {
      setInfoErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Save failed", message: getErrorMessage(error) });
    },
  });

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

  const createAchiever = useMutation({
    mutationFn: () => endpoints.createAchiever(achieverForm, achieverPhoto),
    onSuccess: async () => {
      await invalidate();
      setAchieverForm(emptyAchiever);
      setAchieverPhoto(null);
      setAchieverOpen(false);
      pushToast({ kind: "success", title: "Achiever added" });
    },
    onError: (error) => {
      setAchieverErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Achiever failed", message: getErrorMessage(error) });
    },
  });

  const updateAchiever = useMutation({
    mutationFn: () => endpoints.updateAchiever(achieverForm.id!, achieverForm, achieverPhoto),
    onSuccess: async () => {
      await invalidate();
      setAchieverForm(emptyAchiever);
      setAchieverPhoto(null);
      setAchieverOpen(false);
      pushToast({ kind: "success", title: "Achiever updated" });
    },
    onError: (error) => {
      setAchieverErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) });
    },
  });

  const toggleAchiever = useMutation({
    mutationFn: (achiever: Achiever) => endpoints.toggleAchiever(achiever.id, !achiever.is_active),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Achiever updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Toggle failed", message: getErrorMessage(error) }),
  });

  const deleteAchiever = useMutation({
    mutationFn: (id: number) => endpoints.deleteAchiever(id),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Achiever deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const submitInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInfoErrors({});
    saveInfo.mutate();
  };

  const loading = info.isLoading || facilities.isLoading || achievers.isLoading || reviews.isLoading;
  const hasError = info.error || facilities.error || achievers.error || reviews.error;
  const libraryFeatureImage = mediaUrl(info.data?.feature_image);

  return (
    <>
      <PageHeader title="Library" eyebrow="Public Content" />
      {loading ? <LoadingBlock label="Loading library content" /> : null}
      {hasError ? <ErrorState message="Unable to load library content." /> : null}
      {!loading && !hasError && (
      <div className="space-y-6">

      <FormShell surface onSubmit={submitInfo}>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div
            className="grid min-h-44 place-items-center rounded-lg border border-border bg-panel-strong bg-cover bg-center text-muted"
            style={libraryFeatureImage ? { backgroundImage: `url(${libraryFeatureImage})` } : undefined}
          >
            {libraryFeatureImage ? (
              <span className="sr-only">Library feature image</span>
            ) : (
              <div className="grid justify-items-center gap-2 text-sm">
                <ImagePlus className="h-8 w-8" aria-hidden="true" />
                <span>No feature image</span>
              </div>
            )}
          </div>
          <FileInput
            accept="image/*"
            className="content-start"
            label="Feature Image"
            fileName={featureImage ? `${featureImage.name} selected` : null}
            helper="High quality compressed image will be stored after saving."
            onChange={(event) => setFeatureImage(event.target.files?.[0] ?? null)}
          />
        </div>
        <FormGrid columns={2}>
          <Input label="Name" value={infoForm.name ?? info.data?.name ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, name: event.target.value }))} error={infoErrors.name} />
          <Input label="Tagline" value={infoForm.tagline ?? info.data?.tagline ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, tagline: event.target.value }))} error={infoErrors.tagline} />
          <Input label="Primary Phone" value={infoForm.phone_primary ?? info.data?.phone_primary ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, phone_primary: event.target.value }))} error={infoErrors.phone_primary} />
          <Input label="Email" type="email" value={infoForm.email ?? info.data?.email ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, email: event.target.value }))} error={infoErrors.email} />
          <Input label="Open Time" type="time" value={infoForm.open_time ?? info.data?.open_time ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, open_time: event.target.value }))} error={infoErrors.open_time} />
          <Input label="Close Time" type="time" value={infoForm.close_time ?? info.data?.close_time ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, close_time: event.target.value }))} error={infoErrors.close_time} />
        </FormGrid>
        <Textarea label="About" value={infoForm.about ?? info.data?.about ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, about: event.target.value, description: event.target.value }))} error={infoErrors.about} />
        <Textarea label="Rules" value={infoForm.rules ?? info.data?.rules ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, rules: event.target.value }))} error={infoErrors.rules} />
        <Textarea label="Facilities Text" value={infoForm.facilities ?? info.data?.facilities ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, facilities: event.target.value }))} error={infoErrors.facilities} />
        <FormActions><Button type="submit" loading={saveInfo.isPending} icon={<Save className="h-4 w-4" />}>Save Info</Button></FormActions>
      </FormShell>

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Facilities</h2>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setFacilityForm(emptyFacility); setFacilityImage(null); setFacilityOpen(true); }}>Add</Button>
        </div>
        {facilities.data?.length === 0 ? (
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
                  <>
                    <Button size="sm" variant="secondary" onClick={() => { setFacilityForm(facility); setFacilityImage(null); setFacilityOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="secondary" loading={toggleFacility.isPending && toggleFacility.variables?.id === facility.id} onClick={() => toggleFacility.mutate(facility)}>
                      {facility.is_active ? "Inactive" : "Active"}
                    </Button>
                    <Button size="sm" variant="danger" loading={deleteFacility.isPending && deleteFacility.variables === facility.id} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={() => deleteFacility.mutate(facility.id)}>Delete</Button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Achievers</h2>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setAchieverForm(emptyAchiever); setAchieverPhoto(null); setAchieverOpen(true); }}>Add</Button>
        </div>
        {achievers.data?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted">No achievers added yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(achievers.data ?? []).map((achiever) => {
              const achieverImage = mediaUrl(achiever.photo);
              return (
                <EntityCard
                  key={achiever.id}
                  className="bg-panel-strong"
                  avatar={
                    <div
                      className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-amber-500/15 bg-cover bg-center text-amber-300"
                      style={achieverImage ? { backgroundImage: `url(${achieverImage})` } : undefined}
                      role="img"
                      aria-label={`${achiever.name} photo`}
                    >
                      {achieverImage ? <span className="sr-only">{achiever.name}</span> : <Trophy className="h-5 w-5" aria-hidden="true" />}
                    </div>
                  }
                  title={achiever.name}
                  subtitle={achiever.achievement}
                  metadata={
                    <span className="text-xs text-amber-300">{achiever.year} {achiever.goal ? `/ ${achiever.goal}` : ""}</span>
                  }
                  actions={
                    <>
                      <Button size="sm" variant="secondary" onClick={() => { setAchieverForm(achiever); setAchieverPhoto(null); setAchieverOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="secondary" loading={toggleAchiever.isPending && toggleAchiever.variables?.id === achiever.id} onClick={() => toggleAchiever.mutate(achiever)}>
                        {achiever.is_active ? "Inactive" : "Active"}
                      </Button>
                      <Button size="sm" variant="danger" loading={deleteAchiever.isPending && deleteAchiever.variables === achiever.id} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={() => deleteAchiever.mutate(achiever.id)}>Delete</Button>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Public Reviews</h2>
          <Badge variant="success">{reviewSummary.data?.count ?? reviews.data?.length ?? 0}</Badge>
        </div>
        {reviews.data?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted">No public reviews available.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {(reviews.data ?? []).slice(0, 6).map((review) => (
              <article key={review.id} className="rounded-lg border border-border bg-panel-strong p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{review.student_name}</h3>
                    <p className="mt-1 text-xs text-muted">{formatDate(review.created_at)}</p>
                  </div>
                  <div className="flex gap-1 text-amber-300" role="img" aria-label={`Rating: ${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className={index < review.rating ? "h-4 w-4 fill-current" : "h-4 w-4 text-muted"} aria-hidden="true" />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground">{review.comment}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      </div>
      )}

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

      <Modal open={achieverOpen} title={achieverForm.id ? "Edit Achiever" : "Add Achiever"} onClose={() => setAchieverOpen(false)} maxWidth="2xl">
        <FormShell onSubmit={(event) => { event.preventDefault(); setAchieverErrors({}); achieverForm.id ? updateAchiever.mutate() : createAchiever.mutate(); }}>
          <div className="flex flex-col gap-8 sm:flex-row">
            {/* Left side: Avatar */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative">
                <div 
                  className="flex h-40 w-40 sm:h-52 sm:w-52 items-center justify-center overflow-hidden rounded-[24px] bg-panel-strong bg-cover bg-center text-muted shadow-inner border border-border/50"
                  style={{ backgroundImage: (achieverPhoto || achieverForm.photo) ? `url(${achieverPhoto ? URL.createObjectURL(achieverPhoto) : mediaUrl(achieverForm.photo)})` : undefined }}
                >
                  {!(achieverPhoto || achieverForm.photo) && <ImagePlus className="h-10 w-10 opacity-40" />}
                </div>
                {/* Edit Button Overlay */}
                <label className="absolute -bottom-3 -right-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-panel shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-border text-foreground hover:bg-panel-strong transition-transform hover:scale-105">
                  <span className="sr-only">Upload Photo</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  <input type="file" className="hidden" accept="image/*" onChange={(event) => setAchieverPhoto(event.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>

            {/* Right side: Fields */}
            <div className="flex-1 space-y-5">
              <FormGrid columns={2}>
                <Input label="Name" value={achieverForm.name ?? ""} onChange={(event) => setAchieverForm((current) => ({ ...current, name: event.target.value }))} error={achieverErrors.name} required />
                <Input label="Goal (Exam)" value={achieverForm.goal ?? ""} onChange={(event) => setAchieverForm((current) => ({ ...current, goal: event.target.value }))} error={achieverErrors.goal} />
                <Input label="Year" type="number" value={achieverForm.year ?? new Date().getFullYear()} onChange={(event) => setAchieverForm((current) => ({ ...current, year: Number(event.target.value) }))} error={achieverErrors.year} />
                <Input label="Order" type="number" value={achieverForm.order ?? 0} onChange={(event) => setAchieverForm((current) => ({ ...current, order: Number(event.target.value) }))} error={achieverErrors.order} />
              </FormGrid>
              <Textarea 
                label="Achievement (About)" 
                value={achieverForm.achievement ?? ""} 
                onChange={(event) => setAchieverForm((current) => ({ ...current, achievement: event.target.value }))} 
                error={achieverErrors.achievement} 
                required 
                className="min-h-[110px]"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" className="px-6 rounded-xl" onClick={() => setAchieverOpen(false)}>Cancel</Button>
            <Button type="submit" className="px-8 rounded-xl" loading={createAchiever.isPending || updateAchiever.isPending}>{achieverForm.id ? "Save" : "Add"}</Button>
          </div>
        </FormShell>
      </Modal>
    </>
  );
}
