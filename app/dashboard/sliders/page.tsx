"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Image as ImageIcon, Link, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Input, Switch } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";
import type { HomeSlider } from "@/types/api";

export default function SlidersPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const { data: sliders, isLoading } = useQuery({
    queryKey: ["sliders"],
    queryFn: endpoints.sliders,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<HomeSlider | null>(null);
  const [deletingSlider, setDeletingSlider] = useState<HomeSlider | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sliders"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => endpoints.deleteSliderDELETE(id),
    onSuccess: () => {
      invalidate();
      setDeletingSlider(null);
      pushToast({ kind: "success", title: "Slider deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const activeSliders = sliders?.filter((s) => s.is_active) ?? [];
  const inactiveSliders = sliders?.filter((s) => !s.is_active) ?? [];

  return (
    <>
      <PageHeader
        title="Home Sliders"
        eyebrow="App Customization"
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            Add Slider
          </Button>
        }
      />

      <div className="grid gap-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Active Sliders</h2>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-panel" />
          ) : activeSliders.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-panel text-muted">
              <ImageIcon className="mb-2 h-8 w-8 opacity-20" />
              <p>No active sliders</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeSliders.map((slider) => (
                <SliderCard
                  key={slider.id}
                  slider={slider}
                  onEdit={() => setEditingSlider(slider)}
                  onDelete={() => setDeletingSlider(slider)}
                />
              ))}
            </div>
          )}
        </section>

        {inactiveSliders.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-muted">Inactive Sliders</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
              {inactiveSliders.map((slider) => (
                <SliderCard
                  key={slider.id}
                  slider={slider}
                  onEdit={() => setEditingSlider(slider)}
                  onDelete={() => setDeletingSlider(slider)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <SliderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          invalidate();
        }}
      />

      <SliderModal
        open={!!editingSlider}
        initialData={editingSlider}
        onClose={() => setEditingSlider(null)}
        onSuccess={() => {
          setEditingSlider(null);
          invalidate();
        }}
      />

      <ConfirmDialog
        open={!!deletingSlider}
        title="Delete Slider"
        message="Are you sure you want to delete this slider? This action cannot be undone."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingSlider && deleteMutation.mutate(deletingSlider.id)}
        onClose={() => setDeletingSlider(null)}
      />
    </>
  );
}

function SliderCard({
  slider,
  onEdit,
  onDelete,
}: {
  slider: HomeSlider;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-sm transition-all hover:shadow-md">
      <div className="relative aspect-[21/9] w-full bg-slate-100 dark:bg-slate-800">
        {slider.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slider.image}
            alt={slider.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted opacity-20" />
          </div>
        )}
        <div className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          Order: {slider.sort_order}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-semibold text-foreground">
          {slider.title || "Untitled Slider"}
        </h3>
        {slider.subtitle && (
          <p className="mt-1 line-clamp-1 text-sm text-muted">{slider.subtitle}</p>
        )}
        {slider.link_url && (
          <div className="mt-2 flex items-center text-xs text-primary">
            <Link className="mr-1 h-3 w-3" />
            <span className="line-clamp-1">{slider.link_url}</span>
          </div>
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

function SliderModal({
  open,
  initialData,
  onClose,
  onSuccess,
}: {
  open: boolean;
  initialData?: HomeSlider | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!initialData;
  const pushToast = useToastStore((state) => state.pushToast);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Sync initial data when modal opens
  if (open && initialData && title === "" && !imageFile) {
    setTitle(initialData.title);
    setSubtitle(initialData.subtitle);
    setLinkUrl(initialData.link_url);
    setSortOrder(initialData.sort_order);
    setIsActive(initialData.is_active);
  }

  const close = () => {
    setTitle("");
    setSubtitle("");
    setLinkUrl("");
    setSortOrder(0);
    setIsActive(true);
    setImageFile(null);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subtitle", subtitle);
      formData.append("link_url", linkUrl);
      formData.append("sort_order", String(sortOrder));
      formData.append("is_active", String(isActive));
      if (imageFile) {
        formData.append("image", imageFile);
      }
      return isEditing
        ? endpoints.updateSlider(initialData.id, formData)
        : endpoints.createSlider(formData);
    },
    onSuccess: () => {
      pushToast({ kind: "success", title: `Slider ${isEditing ? "updated" : "added"}` });
      close();
      onSuccess();
    },
    onError: (error) => pushToast({ kind: "error", title: "Error", message: getErrorMessage(error) }),
  });

  return (
    <Modal
      open={open}
      title={isEditing ? "Edit Slider" : "Add Slider"}
      onClose={close}
      className="sm:min-w-[32rem]"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="grid gap-5"
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground">Slider Image {isEditing ? "" : "*"}</label>
          {initialData?.image && !imageFile && (
            <div className="relative mb-2 aspect-[21/9] w-full overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={initialData.image} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            required={!isEditing}
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
          />
          <p className="text-xs text-muted">Recommended ratio: 21:9 (e.g., 1050x450px)</p>
        </div>

        <Input
          label="Title (Optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="E.g., Special Offer"
        />
        
        <Input
          label="Subtitle (Optional)"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="E.g., Get 50% off on new plans"
        />

        <Input
          label="Link URL (Optional)"
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
        />

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              label="Sort Order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-1 flex-col justify-end pt-[26px]">
             <Switch
                label="Active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={close} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? "Save Changes" : "Add Slider"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
