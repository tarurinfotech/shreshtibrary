"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Switch } from "@/components/ui/Input";
import { endpoints } from "@/lib/endpoints";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { HomeSlider } from "@/types/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  slider?: HomeSlider;
};

export function SliderModal({ isOpen, onClose, slider }: Props) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  useEffect(() => {
    if (isOpen) {
      if (slider) {
        setTitle(slider.title);
        setSubtitle(slider.subtitle);
        setLinkUrl(slider.link_url);
        setIsActive(slider.is_active);
        setSortOrder(slider.sort_order.toString());
        setPreviewUrl(slider.image);
      } else {
        setTitle("");
        setSubtitle("");
        setLinkUrl("");
        setIsActive(true);
        setSortOrder("0");
        setPreviewUrl(null);
      }
      setImageFile(null);
      setFieldErrors({});
    }
  }, [isOpen, slider]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("title", title);
      form.append("subtitle", subtitle);
      form.append("link_url", linkUrl);
      form.append("is_active", isActive ? "true" : "false");
      form.append("sort_order", sortOrder);
      if (imageFile) {
        form.append("image", imageFile);
      }

      if (slider) {
        return endpoints.updateSlider(slider.id, form);
      } else {
        return endpoints.createSlider(form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sliders"] });
      pushToast({ kind: "success", title: slider ? "Slider updated" : "Slider created" });
      onClose();
    },
    onError: (err) => {
      setFieldErrors(getFieldErrors(err));
      pushToast({ kind: "error", title: "Save failed", message: getErrorMessage(err) });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    saveMutation.mutate();
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={slider ? "Edit Slider" : "Add Slider"} iconOnlyClose>
      <form onSubmit={onSubmit} className="space-y-4 min-w-[300px]">
        <div className="flex flex-col items-center justify-center gap-4 mb-4">
          <div className="relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/50 hover:bg-muted transition-colors">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-muted">
                <ImageIcon className="mb-2 h-6 w-6" />
                <span className="text-xs font-medium">Upload Image</span>
                <span className="text-[10px] text-muted-foreground mt-1">Recommended: 16:9 ratio</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
        </div>

        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={fieldErrors.title} required />
        <Input label="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} error={fieldErrors.subtitle} required />
        <Input label="Link URL" placeholder="https://" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} error={fieldErrors.link_url} />

        <div className="flex gap-4">
          <div className="flex-1">
            <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} error={fieldErrors.sort_order} required />
          </div>
          <div className="flex-1 flex items-end pb-2">
            <Switch label="Active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saveMutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
