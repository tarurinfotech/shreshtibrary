"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Save, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EntityCard } from "@/components/ui/EntityCard";
import { FormShell } from "@/components/ui/Form";
import { FormGrid } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { mediaUrl } from "@/lib/media";
import { useToastStore } from "@/store/toastStore";
import type { Achiever } from "@/types/api";

const emptyAchiever: Partial<Achiever> = { name: "", goal: "", achievement: "", year: new Date().getFullYear(), is_featured: false, is_active: true, order: 0 };

interface AchieversSectionProps {
  canManageAchievers: boolean;
}

export function AchieversSection({ canManageAchievers }: AchieversSectionProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [achieverOpen, setAchieverOpen] = useState(false);
  const [achieverForm, setAchieverForm] = useState<Partial<Achiever>>(emptyAchiever);
  const [achieverPhoto, setAchieverPhoto] = useState<File | null>(null);
  const [achieverErrors, setAchieverErrors] = useState<Record<string, string>>({});

  const achievers = useQuery({ queryKey: ["achievers"], queryFn: () => endpoints.achievers() });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["achievers"] });
  };

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

  return (
    <>
      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Achievers</h2>
          {canManageAchievers && <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setAchieverForm(emptyAchiever); setAchieverPhoto(null); setAchieverOpen(true); }}>Add</Button>}
        </div>
        {achievers.isLoading ? (
          <div className="py-8 text-center text-sm text-muted">Loading achievers...</div>
        ) : achievers.error ? (
          <div className="py-8 text-center text-sm text-red-500">Failed to load achievers</div>
        ) : achievers.data?.length === 0 ? (
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
                    canManageAchievers ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => { setAchieverForm(achiever); setAchieverPhoto(null); setAchieverOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="secondary" loading={toggleAchiever.isPending && toggleAchiever.variables?.id === achiever.id} onClick={() => toggleAchiever.mutate(achiever)}>
                          {achiever.is_active ? "Inactive" : "Active"}
                        </Button>
                        <Button size="sm" variant="danger" loading={deleteAchiever.isPending && deleteAchiever.variables === achiever.id} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={() => deleteAchiever.mutate(achiever.id)}>Delete</Button>
                      </>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <Modal open={achieverOpen} title={achieverForm.id ? "Edit Achiever" : "Add Achiever"} onClose={() => setAchieverOpen(false)} className="max-w-2xl">
        <FormShell onSubmit={(event) => { event.preventDefault(); setAchieverErrors({}); achieverForm.id ? updateAchiever.mutate() : createAchiever.mutate(); }}>
          <div className="flex flex-col gap-8 sm:flex-row">
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative">
                <div 
                  className="flex h-40 w-40 sm:h-52 sm:w-52 items-center justify-center overflow-hidden rounded-[24px] bg-panel-strong bg-cover bg-center text-muted shadow-inner border border-border/50"
                  style={{ backgroundImage: (achieverPhoto || achieverForm.photo) ? `url(${achieverPhoto ? URL.createObjectURL(achieverPhoto) : mediaUrl(achieverForm.photo)})` : undefined }}
                >
                  {!(achieverPhoto || achieverForm.photo) && <ImagePlus className="h-10 w-10 opacity-40" />}
                </div>
                <label className="absolute -bottom-3 -right-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-panel shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-border text-foreground hover:bg-panel-strong transition-transform hover:scale-105">
                  <span className="sr-only">Upload Photo</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  <input type="file" className="hidden" accept="image/*" onChange={(event) => setAchieverPhoto(event.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>

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
