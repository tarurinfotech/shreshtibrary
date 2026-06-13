"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Save, Star, Trash2, Trophy } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
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
  const [deleteFacilityTarget, setDeleteFacilityTarget] = useState<Facility | null>(null);
  const [deleteAchieverTarget, setDeleteAchieverTarget] = useState<Achiever | null>(null);

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
      setDeleteFacilityTarget(null);
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
      setDeleteAchieverTarget(null);
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
                <ImagePlus className="h-8 w-8" />
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
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setFacilityOpen(true)}>Add</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(facilities.data ?? []).map((facility) => (
            <article key={facility.id} className="rounded-lg border border-border bg-panel-strong p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 bg-cover bg-center text-primary"
                    style={facility.image ? { backgroundImage: `url(${mediaUrl(facility.image)})` } : undefined}
                  >
                    {!facility.image && facility.icon_key ? <span className="text-xl font-bold">{facility.icon_key[0]}</span> : null}
                  </div>
                  <div>
                    <h3 className="font-medium">{facility.name}</h3>
                    <p className="mt-1 text-sm text-muted">{facility.description || facility.icon_key || "No description"}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(facility.is_active ? "active" : "inactive")}>{facility.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" loading={toggleFacility.isPending} onClick={() => toggleFacility.mutate(facility)}>Toggle</Button>
                <Button size="sm" variant="danger" loading={deleteFacility.isPending && deleteFacilityTarget?.id === facility.id} icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteFacilityTarget(facility)}>Delete</Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Achievers</h2>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setAchieverOpen(true)}>Add</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(achievers.data ?? []).map((achiever) => {
            const achieverImage = mediaUrl(achiever.photo);
            return (
              <article key={achiever.id} className="rounded-lg border border-border bg-panel-strong p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-amber-500/15 bg-cover bg-center text-amber-300"
                    style={achieverImage ? { backgroundImage: `url(${achieverImage})` } : undefined}
                  >
                    {achieverImage ? <span className="sr-only">{achiever.name}</span> : <Trophy className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-medium">{achiever.name}</h3>
                    <p className="mt-1 text-sm text-muted">{achiever.achievement}</p>
                    <p className="mt-2 text-xs text-amber-300">{achiever.year} {achiever.goal ? `/ ${achiever.goal}` : ""}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" loading={toggleAchiever.isPending} onClick={() => toggleAchiever.mutate(achiever)}>Toggle</Button>
                  <Button size="sm" variant="danger" loading={deleteAchiever.isPending && deleteAchieverTarget?.id === achiever.id} icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteAchieverTarget(achiever)}>Delete</Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Public Reviews</h2>
          <Badge variant="success">{reviewSummary.data?.count ?? reviews.data?.length ?? 0}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(reviews.data ?? []).slice(0, 6).map((review) => (
            <article key={review.id} className="rounded-lg border border-border bg-panel-strong p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{review.student_name}</h3>
                  <p className="mt-1 text-xs text-muted">{formatDate(review.created_at)}</p>
                </div>
                <div className="flex gap-1 text-amber-300">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className={index < review.rating ? "h-4 w-4 fill-current" : "h-4 w-4 text-muted"} />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground">{review.comment}</p>
            </article>
          ))}
        </div>
      </section>

      <Modal open={facilityOpen} title="Add Facility" onClose={() => setFacilityOpen(false)}>
        <FormShell onSubmit={(event) => { event.preventDefault(); createFacility.mutate(); }}>
          <Input label="Name" value={facilityForm.name ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, name: event.target.value }))} required />
          <Input label="Icon Key" value={facilityForm.icon_key ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, icon_key: event.target.value }))} />
          <FileInput 
            label="Facility Image" 
            accept="image/*" 
            fileName={facilityImage ? `${facilityImage.name} selected` : null}
            onChange={(event) => setFacilityImage(event.target.files?.[0] ?? null)} 
          />
          <Textarea label="Description" value={facilityForm.description ?? ""} onChange={(event) => setFacilityForm((current) => ({ ...current, description: event.target.value }))} />
          <FormActions><Button type="submit" loading={createFacility.isPending} icon={<Plus className="h-4 w-4" />}>Add Facility</Button></FormActions>
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

      <ConfirmDialog
        open={Boolean(deleteFacilityTarget)}
        title="Delete Facility"
        message={deleteFacilityTarget ? `Are you sure you want to delete ${deleteFacilityTarget.name}?` : "Delete facility?"}
        confirmLabel="Delete"
        loading={deleteFacility.isPending}
        onClose={() => setDeleteFacilityTarget(null)}
        onConfirm={() => deleteFacilityTarget && deleteFacility.mutate(deleteFacilityTarget.id)}
      />

      <ConfirmDialog
        open={Boolean(deleteAchieverTarget)}
        title="Delete Achiever"
        message={deleteAchieverTarget ? `Are you sure you want to delete ${deleteAchieverTarget.name}?` : "Delete achiever?"}
        confirmLabel="Delete"
        loading={deleteAchiever.isPending}
        onClose={() => setDeleteAchieverTarget(null)}
        onConfirm={() => deleteAchieverTarget && deleteAchiever.mutate(deleteAchieverTarget.id)}
      />
    </>
  );
}
