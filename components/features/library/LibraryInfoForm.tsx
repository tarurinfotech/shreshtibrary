"use client";

import { FormEvent, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { mediaUrl } from "@/lib/media";
import { useToastStore } from "@/store/toastStore";
import type { LibraryInfo } from "@/types/api";

const tabs = [
  { value: "basic", label: "Basic Info" },
  { value: "address", label: "Address & Location" },
  { value: "social", label: "Social Media" },
  { value: "content", label: "About Content" },
  { value: "gallery", label: "Gallery" }
] as const;

type Tab = typeof tabs[number]["value"];

interface LibraryInfoFormProps {
  canEditInfo: boolean;
  canManageGallery: boolean;
}

export function LibraryInfoForm({ canEditInfo, canManageGallery }: LibraryInfoFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const activeTab = (searchParams.get("tab") as Tab) || "basic";
  
  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const info = useQuery({ queryKey: ["library-info"], queryFn: () => endpoints.libraryInfo() });
  const gallery = useQuery({ queryKey: ["gallery"], queryFn: () => endpoints.galleryImages() });

  const [infoForm, setInfoForm] = useState<Partial<LibraryInfo>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [galleryOrder, setGalleryOrder] = useState(0);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["library-info"] });
    await queryClient.invalidateQueries({ queryKey: ["gallery"] });
  };

  const saveInfo = useMutation({
    mutationFn: () => endpoints.updateLibraryInfo({ ...info.data, ...infoForm }, logoFile, bannerImageFile),
    onSuccess: async () => {
      await invalidate();
      setLogoFile(null);
      setBannerImageFile(null);
      setInfoForm({});
      pushToast({ kind: "success", title: "Library info saved" });
    },
    onError: (error) => {
      setInfoErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Save failed", message: getErrorMessage(error) });
    },
  });

  const uploadGallery = useMutation({
    mutationFn: () => endpoints.uploadGalleryImage(galleryCaption, galleryOrder, galleryFile),
    onSuccess: async () => {
      await invalidate();
      setGalleryCaption("");
      setGalleryOrder(0);
      setGalleryFile(null);
      setGalleryOpen(false);
      pushToast({ kind: "success", title: "Image uploaded" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Upload failed", message: getErrorMessage(error) }),
  });

  const deleteGalleryImage = useMutation({
    mutationFn: (id: number) => endpoints.deleteGalleryImage(id),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Image deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const submitInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInfoErrors({});
    saveInfo.mutate();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setField = (key: keyof LibraryInfo, value: any) => {
    setInfoForm((current) => ({ ...current, [key]: value }));
  };

  const getVal = (key: keyof LibraryInfo) => infoForm[key] ?? info.data?.[key] ?? (typeof infoForm[key] === "boolean" ? false : "");

  const currentLogo = mediaUrl(info.data?.logo);
  const currentBanner = mediaUrl(info.data?.banner_image);

  if (info.isLoading) return <LoadingBlock label="Loading library info" />;
  if (info.error) return <ErrorState message="Unable to load library information." />;

  return (
    <>
      <FormShell surface onSubmit={submitInfo}>
        <SegmentedControl
          value={activeTab}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options={tabs as any}
          onChange={(val) => setActiveTab(val as Tab)}
          className="mb-4"
        />

        {activeTab === "basic" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Library Images</label>
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="flex flex-col gap-2 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-normal text-muted">Logo</span>
                  <div
                    className="grid h-32 w-32 shrink-0 place-items-center rounded-lg border border-border bg-panel-strong bg-contain bg-no-repeat bg-center text-muted"
                    style={(logoFile || currentLogo) ? { backgroundImage: `url(${logoFile ? URL.createObjectURL(logoFile) : currentLogo})` } : undefined}
                  >
                    {!(logoFile || currentLogo) && <ImagePlus className="h-8 w-8" aria-hidden="true" />}
                  </div>
                  <FileInput
                    accept="image/*"
                    label=""
                    fileName={logoFile ? `${logoFile.name} selected` : null}
                    onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-normal text-muted">Banner Image</span>
                  <div
                    className="grid h-32 w-full shrink-0 place-items-center rounded-lg border border-border bg-panel-strong bg-cover bg-center text-muted"
                    style={(bannerImageFile || currentBanner) ? { backgroundImage: `url(${bannerImageFile ? URL.createObjectURL(bannerImageFile) : currentBanner})` } : undefined}
                  >
                    {!(bannerImageFile || currentBanner) && <ImagePlus className="h-8 w-8" aria-hidden="true" />}
                  </div>
                  <FileInput
                    accept="image/*"
                    label=""
                    fileName={bannerImageFile ? `${bannerImageFile.name} selected` : null}
                    onChange={(event) => setBannerImageFile(event.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            </div>

            <FormGrid columns={2}>
              <Input label="Library Name" value={getVal("library_name") as string} onChange={(e) => setField("library_name", e.target.value)} error={infoErrors.library_name} />
              <Input label="Established Year" type="number" value={getVal("established_year") as string} onChange={(e) => setField("established_year", Number(e.target.value))} error={infoErrors.established_year} />
              <Input label="Owner Name" value={getVal("owner_name") as string} onChange={(e) => setField("owner_name", e.target.value)} error={infoErrors.owner_name} />
              <Input label="Email" type="email" value={getVal("email") as string} onChange={(e) => setField("email", e.target.value)} error={infoErrors.email} />
              <Input label="Contact Number" value={getVal("contact_number") as string} onChange={(e) => setField("contact_number", e.target.value)} error={infoErrors.contact_number} />
              <Input label="Website" value={getVal("website") as string} onChange={(e) => setField("website", e.target.value)} error={infoErrors.website} />
              <Input label="Opening Time" type="time" value={getVal("opening_time") as string} onChange={(e) => setField("opening_time", e.target.value)} error={infoErrors.opening_time} />
              <Input label="Closing Time" type="time" value={getVal("closing_time") as string} onChange={(e) => setField("closing_time", e.target.value)} error={infoErrors.closing_time} />
              <Input label="Weekly Off" value={getVal("weekly_off") as string} onChange={(e) => setField("weekly_off", e.target.value)} error={infoErrors.weekly_off} />
              <Input label="Total Capacity" type="number" value={getVal("total_capacity") as string} onChange={(e) => setField("total_capacity", Number(e.target.value))} error={infoErrors.total_capacity} />
              <Input label="Available Seats" type="number" value={getVal("available_seats") as string} onChange={(e) => setField("available_seats", Number(e.target.value))} error={infoErrors.available_seats} />
            </FormGrid>
            <Textarea label="Description" value={getVal("description") as string} onChange={(e) => setField("description", e.target.value)} error={infoErrors.description} />
          </div>
        )}

        {activeTab === "address" && (
          <div className="space-y-6">
            <FormGrid columns={2}>
              <Input label="Address Line 1" value={getVal("address_line1") as string} onChange={(e) => setField("address_line1", e.target.value)} error={infoErrors.address_line1} />
              <Input label="Address Line 2" value={getVal("address_line2") as string} onChange={(e) => setField("address_line2", e.target.value)} error={infoErrors.address_line2} />
              <Input label="Area / Locality" value={getVal("area") as string} onChange={(e) => setField("area", e.target.value)} error={infoErrors.area} />
              <Input label="City" value={getVal("city") as string} onChange={(e) => setField("city", e.target.value)} error={infoErrors.city} />
              <Input label="State" value={getVal("state") as string} onChange={(e) => setField("state", e.target.value)} error={infoErrors.state} />
              <Input label="Country" value={getVal("country") as string} onChange={(e) => setField("country", e.target.value)} error={infoErrors.country} />
              <Input label="PIN Code" value={getVal("pin_code") as string} onChange={(e) => setField("pin_code", e.target.value)} error={infoErrors.pin_code} />
            </FormGrid>
            <FormGrid columns={2}>
              <Input label="Latitude" type="number" step="any" value={getVal("latitude") as string} onChange={(e) => setField("latitude", Number(e.target.value))} error={infoErrors.latitude} />
              <Input label="Longitude" type="number" step="any" value={getVal("longitude") as string} onChange={(e) => setField("longitude", Number(e.target.value))} error={infoErrors.longitude} />
            </FormGrid>
            <Textarea label="Google Map URL" value={getVal("google_map_url") as string} onChange={(e) => setField("google_map_url", e.target.value)} error={infoErrors.google_map_url} />
            
            {/* Map Preview */}
            {(getVal("google_map_url") || (getVal("latitude") && getVal("longitude"))) && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Map Preview</h3>
                  {getVal("google_map_url") && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => window.open(getVal("google_map_url") as string, '_blank')}>
                      Get Directions
                    </Button>
                  )}
                </div>
                <div className="h-64 w-full rounded-lg border border-border overflow-hidden bg-panel-strong relative">
                  <iframe 
                    src={getVal("google_map_url") ? (getVal("google_map_url") as string).includes('embed') ? getVal("google_map_url") as string : `https://maps.google.com/maps?q=${getVal("latitude") || 0},${getVal("longitude") || 0}&hl=en&z=14&output=embed` : `https://maps.google.com/maps?q=${getVal("latitude") || 0},${getVal("longitude") || 0}&hl=en&z=14&output=embed`}
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "social" && (
          <div className="space-y-6">
            <FormGrid columns={2}>
              <Input label="Facebook URL" value={getVal("facebook_url") as string} onChange={(e) => setField("facebook_url", e.target.value)} error={infoErrors.facebook_url} />
              <Input label="Instagram URL" value={getVal("instagram_url") as string} onChange={(e) => setField("instagram_url", e.target.value)} error={infoErrors.instagram_url} />
              <Input label="WhatsApp Number" value={getVal("whatsapp_number") as string} onChange={(e) => setField("whatsapp_number", e.target.value)} error={infoErrors.whatsapp_number} />
              <Input label="Telegram URL" value={getVal("telegram_url") as string} onChange={(e) => setField("telegram_url", e.target.value)} error={infoErrors.telegram_url} />
              <Input label="YouTube URL" value={getVal("youtube_url") as string} onChange={(e) => setField("youtube_url", e.target.value)} error={infoErrors.youtube_url} />
              <Input label="Twitter/X URL" value={getVal("twitter_url") as string} onChange={(e) => setField("twitter_url", e.target.value)} error={infoErrors.twitter_url} />
              <Input label="LinkedIn URL" value={getVal("linkedin_url") as string} onChange={(e) => setField("linkedin_url", e.target.value)} error={infoErrors.linkedin_url} />
            </FormGrid>
          </div>
        )}

        {activeTab === "content" && (
          <div className="space-y-6">
            <FormGrid columns={2}>
              <Input label="Tagline" value={getVal("tagline") as string} onChange={(e) => setField("tagline", e.target.value)} error={infoErrors.tagline} />
              <Input label="Welcome Message" value={getVal("welcome_message") as string} onChange={(e) => setField("welcome_message", e.target.value)} error={infoErrors.welcome_message} />
              <Input label="Mission" value={getVal("mission") as string} onChange={(e) => setField("mission", e.target.value)} error={infoErrors.mission} />
              <Input label="Vision" value={getVal("vision") as string} onChange={(e) => setField("vision", e.target.value)} error={infoErrors.vision} />
              <Input label="Emergency Contact" value={getVal("emergency_contact") as string} onChange={(e) => setField("emergency_contact", e.target.value)} error={infoErrors.emergency_contact} />
              <Input label="Footer Text" value={getVal("footer_text") as string} onChange={(e) => setField("footer_text", e.target.value)} error={infoErrors.footer_text} />
            </FormGrid>
            <Textarea label="Library History" value={getVal("history") as string} onChange={(e) => setField("history", e.target.value)} error={infoErrors.history} />
            <Textarea label="Services Offered" value={getVal("services") as string} onChange={(e) => setField("services", e.target.value)} error={infoErrors.services} />
            <Textarea label="Courses Supported" value={getVal("courses_supported") as string} onChange={(e) => setField("courses_supported", e.target.value)} error={infoErrors.courses_supported} />
            <Textarea label="Statistics Description" value={getVal("statistics_description") as string} onChange={(e) => setField("statistics_description", e.target.value)} error={infoErrors.statistics_description} />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">FAQ</label>
                {canEditInfo && (
                  <Button type="button" size="sm" onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const faqs = (getVal("faq") as any[]) || [];
                    setField("faq", [...faqs, { question: "", answer: "" }]);
                  }}>Add FAQ</Button>
                )}
              </div>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {((getVal("faq") as any[]) || []).map((faq, i) => (
                <div key={i} className="flex gap-2 items-start border p-3 rounded bg-panel">
                  <div className="flex-1 space-y-2">
                    <Input label="Question" placeholder="Enter question..." value={faq.question} onChange={(e) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const faqs = [...((getVal("faq") as any[]) || [])];
                      faqs[i] = { ...faqs[i], question: e.target.value };
                      setField("faq", faqs);
                    }} />
                    <Textarea label="Answer" placeholder="Enter answer..." value={faq.answer} onChange={(e) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const faqs = [...((getVal("faq") as any[]) || [])];
                      faqs[i] = { ...faqs[i], answer: e.target.value };
                      setField("faq", faqs);
                    }} />
                  </div>
                  {canEditInfo && (
                    <Button type="button" variant="danger" onClick={() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const faqs = [...((getVal("faq") as any[]) || [])];
                      faqs.splice(i, 1);
                      setField("faq", faqs);
                    }}>Remove</Button>
                  )}
                </div>
              ))}
            </div>
            <Textarea label="Testimonials (Content)" value={getVal("testimonials") as string} onChange={(e) => setField("testimonials", e.target.value)} error={infoErrors.testimonials} />
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold">Gallery Images</h3>
              {canManageGallery && <Button type="button" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setGalleryOpen(true)}>Add Image</Button>}
            </div>
            {gallery.isLoading ? (
              <div className="py-8 text-center text-sm text-muted">Loading gallery...</div>
            ) : gallery.error ? (
              <div className="py-8 text-center text-sm text-red-500">Failed to load gallery</div>
            ) : gallery.data?.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted">No gallery images added yet.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                {(gallery.data ?? []).map((img) => (
                  <div key={img.id} className="relative group rounded-lg border overflow-hidden">
                    <img 
                      src={mediaUrl(img.image_url ?? undefined) ?? undefined} 
                      alt={img.caption || "Gallery Image"} 
                      className="w-full h-32 object-cover" 
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400?text=Image+Not+Found'; }}
                    />
                    {canManageGallery && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button type="button" size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deleteGalleryImage.mutate(img.id)}>Delete</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab !== "gallery" && canEditInfo && (
          <FormActions><Button type="submit" loading={saveInfo.isPending} icon={<Save className="h-4 w-4" />}>Save Info</Button></FormActions>
        )}
      </FormShell>

      <Modal open={galleryOpen} title="Upload Gallery Image" onClose={() => setGalleryOpen(false)}>
        <FormShell onSubmit={(event) => { event.preventDefault(); uploadGallery.mutate(); }}>
          <Input label="Caption (Optional)" value={galleryCaption} onChange={(e) => setGalleryCaption(e.target.value)} />
          <Input label="Order" type="number" value={galleryOrder} onChange={(e) => setGalleryOrder(Number(e.target.value))} />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Image File</span>
            {galleryFile && (
              <div 
                className="h-32 w-full shrink-0 rounded-lg bg-panel-strong bg-cover bg-center border border-border"
                style={{ backgroundImage: `url(${URL.createObjectURL(galleryFile)})` }}
              />
            )}
            <FileInput 
              label="Select Image" 
              accept="image/*" 
              fileName={galleryFile ? `${galleryFile.name} selected` : null}
              onChange={(event) => setGalleryFile(event.target.files?.[0] ?? null)} 
              required
            />
          </div>
          <FormActions><Button type="submit" loading={uploadGallery.isPending} icon={<Save className="h-4 w-4" />}>Upload</Button></FormActions>
        </FormShell>
      </Modal>
    </>
  );
}
