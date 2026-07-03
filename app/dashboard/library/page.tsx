"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Save, Star, Trash2, Trophy } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { EntityCard } from "@/components/ui/EntityCard";
import { Button } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input, Textarea, Switch } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
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

const tabs = [
  { value: "basic", label: "Basic Info" },
  { value: "address", label: "Address & Location" },
  { value: "facilities", label: "Facilities" },
  { value: "social", label: "Social Media" },
  { value: "content", label: "About Content" },
  { value: "membership", label: "Membership Info" },
  { value: "gallery", label: "Gallery" }
] as const;

type Tab = typeof tabs[number]["value"];

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  
  const info = useQuery({ queryKey: ["library-info"], queryFn: endpoints.libraryInfo });
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: endpoints.facilities });
  const achievers = useQuery({ queryKey: ["achievers"], queryFn: endpoints.achievers });
  const reviews = useQuery({ queryKey: ["public-reviews"], queryFn: endpoints.publicReviews });
  const reviewSummary = useQuery({ queryKey: ["review-summary"], queryFn: endpoints.reviewSummary });
  const gallery = useQuery({ queryKey: ["gallery"], queryFn: endpoints.galleryImages });
  
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  
  const [infoForm, setInfoForm] = useState<Partial<LibraryInfo>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [facilityForm, setFacilityForm] = useState<Partial<Facility>>(emptyFacility);
  const [facilityImage, setFacilityImage] = useState<File | null>(null);
  
  const [achieverOpen, setAchieverOpen] = useState(false);
  const [achieverForm, setAchieverForm] = useState<Partial<Achiever>>(emptyAchiever);
  const [achieverPhoto, setAchieverPhoto] = useState<File | null>(null);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [galleryOrder, setGalleryOrder] = useState(0);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  
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
    mutationFn: () => endpoints.updateLibraryInfo({ ...info.data, ...infoForm }, logoFile, bannerImageFile),
    onSuccess: async () => {
      await invalidate();
      setLogoFile(null);
      setBannerImageFile(null);
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

  const setField = (key: keyof LibraryInfo, value: any) => {
    setInfoForm((current) => ({ ...current, [key]: value }));
  };

  const getVal = (key: keyof LibraryInfo) => infoForm[key] ?? info.data?.[key] ?? (typeof infoForm[key] === "boolean" ? false : "");
  const getBool = (key: keyof LibraryInfo) => Boolean(infoForm[key] ?? info.data?.[key] ?? false);

  const currentLogo = mediaUrl(info.data?.logo);
  const currentBanner = mediaUrl(info.data?.banner_image);

  return (
    <>
      <PageHeader title="Library" eyebrow="Public Content" />
      
      {info.isLoading ? (
        <LoadingBlock label="Loading library info" />
      ) : info.error ? (
        <ErrorState message="Unable to load library information." />
      ) : (
        <div className="space-y-6">
          <FormShell surface onSubmit={submitInfo}>
            <SegmentedControl
              value={activeTab}
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

        {activeTab === "facilities" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Switch label="Wi-Fi" checked={getBool("wifi")} onChange={(e) => setField("wifi", e.target.checked)} />
            <Switch label="Air Conditioning (AC)" checked={getBool("ac")} onChange={(e) => setField("ac", e.target.checked)} />
            <Switch label="CCTV Security" checked={getBool("cctv")} onChange={(e) => setField("cctv", e.target.checked)} />
            <Switch label="Drinking Water" checked={getBool("drinking_water")} onChange={(e) => setField("drinking_water", e.target.checked)} />
            <Switch label="Personal Lockers" checked={getBool("lockers")} onChange={(e) => setField("lockers", e.target.checked)} />
            <Switch label="Charging Points" checked={getBool("charging_points")} onChange={(e) => setField("charging_points", e.target.checked)} />
            <Switch label="Parking" checked={getBool("parking")} onChange={(e) => setField("parking", e.target.checked)} />
            <Switch label="Reading Area" checked={getBool("reading_area")} onChange={(e) => setField("reading_area", e.target.checked)} />
            <Switch label="Computer Access" checked={getBool("computer_access")} onChange={(e) => setField("computer_access", e.target.checked)} />
            <Switch label="Printing Facility" checked={getBool("printing")} onChange={(e) => setField("printing", e.target.checked)} />
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
                <Button type="button" size="sm" onClick={() => {
                  const faqs = (getVal("faq") as any[]) || [];
                  setField("faq", [...faqs, { question: "", answer: "" }]);
                }}>Add FAQ</Button>
              </div>
              {((getVal("faq") as any[]) || []).map((faq, i) => (
                <div key={i} className="flex gap-2 items-start border p-3 rounded bg-panel">
                  <div className="flex-1 space-y-2">
                    <Input label="Question" placeholder="Enter question..." value={faq.question} onChange={(e) => {
                      const faqs = [...((getVal("faq") as any[]) || [])];
                      faqs[i] = { ...faqs[i], question: e.target.value };
                      setField("faq", faqs);
                    }} />
                    <Textarea label="Answer" placeholder="Enter answer..." value={faq.answer} onChange={(e) => {
                      const faqs = [...((getVal("faq") as any[]) || [])];
                      faqs[i] = { ...faqs[i], answer: e.target.value };
                      setField("faq", faqs);
                    }} />
                  </div>
                  <Button type="button" variant="danger" onClick={() => {
                    const faqs = [...((getVal("faq") as any[]) || [])];
                    faqs.splice(i, 1);
                    setField("faq", faqs);
                  }}>Remove</Button>
                </div>
              ))}
            </div>
            <Textarea label="Testimonials (Content)" value={getVal("testimonials") as string} onChange={(e) => setField("testimonials", e.target.value)} error={infoErrors.testimonials} />
          </div>
        )}

        {activeTab === "membership" && (
          <div className="space-y-6">
            <Textarea label="Membership Details" value={getVal("membership_details") as string} onChange={(e) => setField("membership_details", e.target.value)} error={infoErrors.membership_details} />
            <Textarea label="Registration Process" value={getVal("registration_process") as string} onChange={(e) => setField("registration_process", e.target.value)} error={infoErrors.registration_process} />
            <Textarea label="Required Documents" value={getVal("required_documents") as string} onChange={(e) => setField("required_documents", e.target.value)} error={infoErrors.required_documents} />
            <Textarea label="Membership Benefits" value={getVal("membership_benefits") as string} onChange={(e) => setField("membership_benefits", e.target.value)} error={infoErrors.membership_benefits} />
            <Textarea label="Library Rules" value={getVal("library_rules") as string} onChange={(e) => setField("library_rules", e.target.value)} error={infoErrors.library_rules} />
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold">Gallery Images</h3>
              <Button type="button" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setGalleryOpen(true)}>Add Image</Button>
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
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button type="button" size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deleteGalleryImage.mutate(img.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab !== "gallery" && (
          <FormActions><Button type="submit" loading={saveInfo.isPending} icon={<Save className="h-4 w-4" />}>Save Info</Button></FormActions>
        )}
      </FormShell>

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Facilities</h2>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setFacilityForm(emptyFacility); setFacilityImage(null); setFacilityOpen(true); }}>Add</Button>
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
        {reviews.isLoading ? (
          <div className="py-8 text-center text-sm text-muted">Loading reviews...</div>
        ) : reviews.error ? (
          <div className="py-8 text-center text-sm text-red-500">Failed to load reviews</div>
        ) : reviews.data?.length === 0 ? (
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
