"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, GripVertical, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { endpoints } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { SliderModal } from "./components/SliderModal";
import type { HomeSlider } from "@/types/api";

export default function SlidersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<HomeSlider | undefined>();
  const pushToast = useToastStore((state) => state.pushToast);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key);
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };

  const canManageSliders = hasPerm("LibraryManagement.Slider");

  const { data: sliders = [], isLoading } = useQuery({
    queryKey: ["sliders"],
    queryFn: endpoints.sliders,
  });

  const deleteSlider = useMutation({
    mutationFn: endpoints.deleteSlider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sliders"] });
      pushToast({ kind: "success", title: "Slider deleted successfully" });
    },
    onError: (err) => pushToast({ kind: "error", title: "Failed to delete slider", message: getErrorMessage(err) }),
  });

  return (
    <>
      <PageHeader
        title="Home Sliders"
        eyebrow="Library"
        actions={
          canManageSliders ? (
            <Button onClick={() => { setEditingSlider(undefined); setIsModalOpen(true); }} icon={<Plus className="h-4 w-4" />}>
              Add Slider
            </Button>
          ) : undefined
        }
      />

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <p className="text-muted">Loading sliders...</p>
        ) : sliders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-panel/50">
            <ImageIcon className="h-12 w-12 text-muted mb-4" />
            <p className="text-muted font-medium">No sliders found</p>
            <p className="text-sm text-muted-foreground mt-1">Add a slider to display on the student app home screen.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sliders.map((slider) => (
              <div key={slider.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-sm transition-all hover:shadow-md">
                <div className="aspect-[21/9] w-full bg-muted relative">
                  {slider.image ? (
                    <img src={mediaUrl(slider.image) ?? ""} alt={slider.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                  {!slider.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-background text-foreground text-xs font-semibold px-2 py-1 rounded">Inactive</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-foreground line-clamp-1">{slider.title || "Untitled"}</h3>
                  <p className="text-sm text-muted line-clamp-1 mt-1">{slider.subtitle || "No subtitle"}</p>
                  <p className="text-xs text-muted-foreground mt-2 font-mono line-clamp-1">{slider.link_url}</p>
                  
                  <div className="mt-4 flex items-center justify-end gap-2 pt-4 border-t border-border/50">
                    {canManageSliders && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingSlider(slider); setIsModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this slider?")) deleteSlider.mutate(slider.id); }} className="text-danger hover:bg-danger/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SliderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        slider={editingSlider}
      />
    </>
  );
}
