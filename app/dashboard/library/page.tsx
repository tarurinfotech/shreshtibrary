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
import { getErrorMessage } from "@/lib/api";
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["library-info"] });
    queryClient.invalidateQueries({ queryKey: ["facilities"] });
    queryClient.invalidateQueries({ queryKey: ["achievers"] });
    queryClient.invalidateQueries({ queryKey: ["public-reviews"] });
  };

  const saveInfo = useMutation({
    mutationFn: () => endpoints.updateLibraryInfo({ ...info.data, ...infoForm }, featureImage),
    onSuccess: () => {
      invalidate();
      setFeatureImage(null);
      pushToast({ kind: "success", title: "Library info saved" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Save failed", message: getErrorMessage(error) }),
  });

  const createFacility = useMutation({
    mutationFn: () => endpoints.createFacility(facilityForm, facilityImage),
    onSuccess: () => {
      invalidate();
      setFacilityForm(emptyFacility);
      setFacilityImage(null);
      setFacilityOpen(false);
      pushToast({ kind: "success", title: "Facility added" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Facility failed", message: getErrorMessage(error) }),
  });

  const updateFacility = useMutation({
    mutationFn: (facility: Facility) => endpoints.updateFacility(facility.id, facilityForm, facilityImage),
    onSuccess: () => {
      invalidate();
      setFacilityForm(emptyFacility);
      setFacilityImage(null);
      setFacilityOpen(false);
      pushToast({ kind: "success", title: "Facility updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) }),
  });

  const toggleFacility = useMutation({
    mutationFn: (facility: Facility) => endpoints.toggleFacility(facility.id, !facility.is_active),
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Facility updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Toggle failed", message: getErrorMessage(error) }),
  });

  const deleteFacility = useMutation({
    mutationFn: (id: number) => endpoints.deleteFacility(id),
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Facility deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const createAchiever = useMutation({
    mutationFn: () => endpoints.createAchiever(achieverForm, achieverPhoto),
    onSuccess: () => {
      invalidate();
      setAchieverForm(emptyAchiever);
      setAchieverPhoto(null);
      setAchieverOpen(false);
      pushToast({ kind: "success", title: "Achiever added" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Achiever failed", message: getErrorMessage(error) }),
  });

  const toggleAchiever = useMutation({
    mutationFn: (achiever: Achiever) => endpoints.toggleAchiever(achiever.id, !achiever.is_active),
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Achiever updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Toggle failed", message: getErrorMessage(error) }),
  });

  const deleteAchiever = useMutation({
    mutationFn: (id: number) => endpoints.deleteAchiever(id),
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Achiever deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const submitInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          <Input label="Name" value={infoForm.name ?? info.data?.name ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Tagline" value={infoForm.tagline ?? info.data?.tagline ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, tagline: event.target.value }))} />
          <Input label="Primary Phone" value={infoForm.phone_primary ?? info.data?.phone_primary ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, phone_primary: event.target.value }))} />
          <Input label="Email" type="email" value={infoForm.email ?? info.data?.email ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, email: event.target.value }))} />
          <Input label="Open Time" type="time" value={infoForm.open_time ?? info.data?.open_time ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, open_time: event.target.value }))} />
          <Input label="Close Time" type="time" value={infoForm.close_time ?? info.data?.close_time ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, close_time: event.target.value }))} />
        </FormGrid>
        <Textarea label="About" value={infoForm.about ?? info.data?.about ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, about: event.target.value, description: event.target.value }))} />
        <Textarea label="Rules" value={infoForm.rules ?? info.data?.rules ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, rules: event.target.value }))} />
        <Textarea label="Facilities Text" value={infoForm.facilities ?? info.data?.facilities ?? ""} onChange={(event) => setInfoForm((current) => ({ ...current, facilities: event.target.value }))} />
        <FormActions><Button type="submit" loading={saveInfo.isPending} icon={<Save className="h-4 w-4" />}>Save Info</Button></FormActions>
      </FormShell>

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Facilities</h2>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => {
            setFacilityForm(emptyFacility);
            setFacilityImage(null);
            setFacilityOpen(true);
          }}>Add</Button>
        </div>
        {facilities.data?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted">No facilities added yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(facilities.data ?? []).map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onEdit={() => {
                  setFacilityForm(facility);
                  setFacilityImage(null);
                  setFacilityOpen(true);
                }}
                onDelete={() => deleteFacility.mutate(facility.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Achievers</h2>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setAchieverOpen(true)}>Add</Button>
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
                      <Button size="sm" variant="secondary" loading={toggleAchiever.isPending} onClick={() => toggleAchiever.mutate(achiever)}>Toggle</Button>
                      <Button size="sm" variant="danger" loading={deleteAchiever.isPending} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={() => deleteAchiever.mutate(achiever.id)}>Delete</Button>
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
        <FormShell onSubmit={(event) => { 
          event.preventDefault(); 
          if (facilityForm.id) {
            updateFacility.mutate(facilityForm as Facility);
          } else {
            createFacility.mutate(); 
          }
        }}>
          <Input label="Name" value={facilityForm.name ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, name: event.target.value }))} required />
          <Input label="Icon Key (Fallback)" value={facilityForm.icon_key ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, icon_key: event.target.value }))} />
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Facility Image</label>
            {facilityForm.image && !facilityImage && (
              <div className="relative mb-2 aspect-[21/9] w-full overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(facilityForm.image) ?? ""} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFacilityImage(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
            />
          </div>
          <Textarea label="Description" value={facilityForm.description ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, description: event.target.value }))} />
          <FormActions><Button type="submit" loading={createFacility.isPending || updateFacility.isPending} icon={facilityForm.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>{facilityForm.id ? "Save Changes" : "Add Facility"}</Button></FormActions>
        </FormShell>
      </Modal>

      <Modal open={achieverOpen} title="Add Achiever" onClose={() => setAchieverOpen(false)}>
        <FormShell onSubmit={(event) => { event.preventDefault(); createAchiever.mutate(); }}>
          <FormGrid columns={2}>
            <Input label="Name" value={achieverForm.name ?? ""} onChange={(event) => setAchieverForm((current) => ({ ...current, name: event.target.value }))} required />
            <Input label="Goal" value={achieverForm.goal ?? ""} onChange={(event) => setAchieverForm((current) => ({ ...current, goal: event.target.value }))} />
            <Input label="Year" type="number" value={achieverForm.year ?? new Date().getFullYear()} onChange={(event) => setAchieverForm((current) => ({ ...current, year: Number(event.target.value) }))} />
            <Input label="Order" type="number" value={achieverForm.order ?? 0} onChange={(event) => setAchieverForm((current) => ({ ...current, order: Number(event.target.value) }))} />
          </FormGrid>
          <Textarea label="Achievement" value={achieverForm.achievement ?? ""} onChange={(event) => setAchieverForm((current) => ({ ...current, achievement: event.target.value }))} required />
          <FileInput
            accept="image/*"
            label="Photo"
            fileName={achieverPhoto ? `${achieverPhoto.name} selected` : null}
            helper="Optional image, compressed on upload."
            onChange={(event) => setAchieverPhoto(event.target.files?.[0] ?? null)}
          />
          <FormActions><Button type="submit" loading={createAchiever.isPending} icon={<Plus className="h-4 w-4" />}>Add Achiever</Button></FormActions>
        </FormShell>
      </Modal>
    </>
  );
}

function FacilityCard({
  facility,
  onEdit,
  onDelete,
}: {
  facility: Facility;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-sm transition-all hover:shadow-md">
      <div className="relative aspect-[21/9] w-full bg-slate-100 dark:bg-slate-800">
        {facility.image && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(facility.image) ?? ""}
            alt={facility.name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {facility.icon_key ? (
              <span className="text-4xl font-bold text-muted opacity-20" aria-hidden="true">{facility.icon_key[0]}</span>
            ) : (
              <ImagePlus className="h-8 w-8 text-muted opacity-20" />
            )}
          </div>
        )}
        <div className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          {facility.is_active ? "Active" : "Inactive"}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-semibold text-foreground">
          {facility.name}
        </h3>
        {facility.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{facility.description}</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="danger" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
