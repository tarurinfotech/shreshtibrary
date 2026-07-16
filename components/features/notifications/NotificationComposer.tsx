"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Check, Clock, Image as ImageIcon, MessageSquare, Send, Sparkles, Target, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DateInput, TimeInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Avatar } from "@/components/ui/Avatar";
import { getErrorMessage } from "@/lib/api";
import { endpoints, type NotificationPayload } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";

const emptyNotification: NotificationPayload = {
  title: "",
  body: "",
  type: "GENERAL",
  target: "ALL",
  target_group: "all",
  send_push: true,
  send_email: false,
  send_sms: false,
  send_whatsapp: false,
  layout: "text_only",
  audience: "all",
  display_mode: "persistent",
  subtitle: "",
  description: "",
  link_url: "",
  link_button_text: "",
  event_date: "",
  scheduled_at: "",
  recurring_time: "",
  expires_at: "",
  selected_students: "",
};

interface NotificationComposerProps {
  canCreate: boolean;
  onOpenTemplates: () => void;
  form: NotificationPayload;
  setForm: React.Dispatch<React.SetStateAction<NotificationPayload>>;
}

export function NotificationComposer({ canCreate, onOpenTemplates, form, setForm }: NotificationComposerProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [deliveryMethod, setDeliveryMethod] = useState<"now" | "later">("now");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  const allStudents = useQuery({ queryKey: ["all-students"], queryFn: () => endpoints.allStudents() });

  const selectedStudentIds = useMemo(() => {
    if (!form?.selected_students) return [];
    return (form.selected_students.split(',') ?? []).map(s => parseInt(s.trim())).filter(id => !isNaN(id));
  }, [form?.selected_students]);

  const toggleStudent = (id: number) => {
    const isSelected = selectedStudentIds.includes(id);
    let newIds;
    if (isSelected) {
      newIds = selectedStudentIds.filter(sId => sId !== id);
    } else {
      newIds = [...selectedStudentIds, id];
    }
    setForm(curr => ({ ...curr, selected_students: newIds.join(',') }));
  };

  const getFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        fd.append(key, String(value));
      }
    });
    if (backgroundImage) {
      fd.append("background_image", backgroundImage);
    }
    galleryImages.forEach((img) => {
      fd.append("images", img);
    });
    return fd;
  };

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["scheduled-notifications"] });
  };

  const send = useMutation({
    mutationFn: () => endpoints.sendNotification(getFormData()),
    onSuccess: async () => {
      await invalidate();
      setForm(emptyNotification);
      setBackgroundImage(null);
      setGalleryImages([]);
      pushToast({ kind: "success", title: "Notification dispatched" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Dispatch failed", message: getErrorMessage(error) }),
  });

  const schedule = useMutation({
    mutationFn: () => endpoints.scheduleNotification(getFormData()),
    onSuccess: async () => {
      await invalidate();
      setForm(emptyNotification);
      setBackgroundImage(null);
      setGalleryImages([]);
      pushToast({ kind: "success", title: "Notification scheduled" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Schedule failed", message: getErrorMessage(error) }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (deliveryMethod === "later") {
      if (form.scheduled_at) schedule.mutate();
      else pushToast({ kind: "error", title: "Error", message: "Please select a date and time." });
    } else {
      send.mutate();
    }
  };

  const MobilePreview = () => {
    const bgUrl = backgroundImage ? URL.createObjectURL(backgroundImage) : null;
    const galleryUrls = (galleryImages ?? []).map(f => URL.createObjectURL(f));

    return (
      <div className="sticky top-6 rounded-[2rem] border-[6px] border-panel-strong bg-background overflow-hidden shadow-xl h-[550px] w-full max-w-[320px] mx-auto flex flex-col items-center justify-center relative">
        <div className="absolute top-0 inset-x-0 h-5 bg-panel-strong rounded-b-xl w-28 mx-auto z-50"></div>
        
        <div className="w-full h-full p-4 overflow-y-auto pt-10 text-foreground relative">
          <div className="text-center text-xs text-muted mb-6">Shresht Library App Preview</div>
          
          <div className="mb-4">
            <h2 className="text-xl font-bold">Hello, Student</h2>
            <p className="text-xs text-muted">Welcome back to the library</p>
          </div>

          <div className="w-full h-24 bg-panel rounded-xl mb-4 flex items-center justify-center text-muted text-sm font-medium border border-border">
            (Home Slider Carousel)
          </div>

          <div className="bg-panel rounded-xl p-3 shadow-sm mb-4 border border-border">
            <h3 className="font-bold text-sm mb-3">Today</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><Check className="w-4 h-4 text-green-600" /></div>
                <div>
                  <div className="text-xs text-muted">Attendance</div>
                  <div className="text-sm font-semibold">Marked today</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100/20 flex items-center justify-center"><div className="w-4 h-4 bg-accent-sky rounded-sm" /></div>
                <div>
                  <div className="text-xs text-muted">Active plan</div>
                  <div className="text-sm font-semibold">Premium Monthly</div>
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="font-bold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 pb-8">
             <div className="bg-panel-strong p-3 rounded-lg text-center text-xs font-semibold text-foreground border border-border">Study</div>
             <div className="bg-panel-strong p-3 rounded-lg text-center text-xs font-semibold text-foreground border border-border">Plans</div>
          </div>

          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/60 rounded-[1.8rem]">
            <div className="relative w-full max-w-sm mt-4">
              <div className={`rounded-xl overflow-hidden shadow-2xl relative border border-border ${form.layout === 'background_image' ? 'bg-[#0b0e1a] relative' : 'bg-panel'}`}>
                
                {form.layout === 'background_image' && bgUrl && (
                  <>
                    <img src={bgUrl} alt="bg" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60"></div>
                  </>
                )}

                <div className={`p-4 relative z-10 ${form.layout === 'background_image' ? 'text-white' : 'text-foreground'}`}>
                  
                  {form.layout === 'full_image' && (galleryUrls ?? []).length > 0 && (
                    <img src={galleryUrls[0]} alt="gallery" className="w-full h-32 rounded-xl mb-3 object-cover shadow-sm" />
                  )}
                  {form.layout === 'half_image' && (galleryUrls ?? []).length > 0 && (
                    <img src={galleryUrls[0]} alt="gallery" className="w-full h-20 object-cover rounded-xl mb-3 shadow-sm" />
                  )}

                  <h4 className="font-bold text-base leading-tight text-center">{form.title || "Notification Title"}</h4>
                  
                  {form.subtitle && (
                    <p className={`text-sm mt-1 text-center font-medium ${form.layout === 'background_image' ? 'text-accent-yellow' : 'text-primary'}`}>{form.subtitle}</p>
                  )}
                  
                  <p className={`text-[13px] mt-3 leading-relaxed text-center ${form.layout === 'background_image' ? 'text-white/80' : 'text-muted'}`}>
                    {form.body || "Notification body text goes here..."}
                  </p>
                  
                  {(form.link_url || form.link_button_text) && (
                    <div className="mt-5">
                      <div className={`w-full text-center px-4 py-3 rounded-full text-sm font-bold shadow-sm ${form.layout === 'background_image' ? 'bg-panel text-foreground' : 'bg-primary text-primary-contrast'}`}>
                        {form.link_button_text || "YAY!"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute -top-3 -right-3 w-8 h-8 bg-panel rounded-full flex items-center justify-center shadow-lg border border-border cursor-pointer z-30 text-muted">
                <X className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <form onSubmit={submit} className="space-y-5">
        {/* Step 1: Layout Style */}
        <div className="bg-panel rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">1. Visual Style</h3>
              <p className="text-sm text-muted">How should this notification look on their screen?</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: "text_only", label: "Text Only", desc: "Simple alert" },
              { value: "half_image", label: "Half Image", desc: "Top banner" },
              { value: "full_image", label: "Full Image", desc: "Large visual" },
              { value: "background_image", label: "Background", desc: "Immersive" },
            ].map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setForm((curr) => ({ ...curr, layout: l.value as any }))}
                className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center transition-all ${
                  form.layout === l.value
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border/60 bg-background/50 text-muted hover:border-primary/40 hover:bg-panel-strong"
                }`}
              >
                <ImageIcon className={`h-5 w-5 mb-1 transition-colors ${form.layout === l.value ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span className="font-bold text-xs">{l.label}</span>
                <span className="text-[10px] opacity-70 hidden sm:block">{l.desc}</span>
              </button>
            ))}
          </div>

          {form.layout === "background_image" && (
            <div className="mt-6 bg-background/50 p-5 rounded-2xl border border-border/60 border-dashed transition-all">
              <label className="mb-3 block text-sm font-bold text-foreground">Upload Background Image</label>
              <input type="file" accept="image/*" onChange={(e) => setBackgroundImage(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:text-primary file:px-5 file:py-2.5 file:font-bold file:cursor-pointer hover:file:bg-primary/20 transition-colors" />
            </div>
          )}

          {(form.layout === "half_image" || form.layout === "full_image") && (
            <div className="mt-6 bg-background/50 p-5 rounded-2xl border border-border/60 border-dashed transition-all">
              <label className="mb-3 block text-sm font-bold text-foreground">Upload Gallery Images</label>
              <input type="file" accept="image/*" multiple onChange={(e) => setGalleryImages(Array.from(e.target.files ?? []))} className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:text-primary file:px-5 file:py-2.5 file:font-bold file:cursor-pointer hover:file:bg-primary/20 transition-colors" />
              {(galleryImages ?? []).length > 0 && <p className="mt-4 text-xs font-bold text-primary flex items-center gap-1.5 bg-primary/5 w-fit px-3 py-1.5 rounded-md"><Check className="w-3.5 h-3.5"/> {(galleryImages ?? []).length} image(s) ready</p>}
            </div>
          )}
        </div>

        {/* Step 2: Content */}
        <div className="bg-panel rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">2. Message Content</h3>
              <p className="text-sm text-muted">What do you want to announce to your students?</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Main Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required placeholder="e.g. Holiday Announcement" />
              <Input label="Subtitle (Optional)" value={form.subtitle ?? ""} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} placeholder="e.g. Library Closed" />
            </div>
            <Textarea label="Short Message" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} required placeholder="Keep it brief and clear..." rows={3} />
            <Textarea label="Detailed Description (Optional)" value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add any extra details here..." rows={3} />
            
            <div className="grid gap-5 sm:grid-cols-2 bg-background/50 p-5 rounded-2xl border border-border/50">
              <div className="col-span-2"><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Action Button (Optional)</p></div>
              <Input label="Button Link (URL)" type="url" value={form.link_url ?? ""} onChange={(event) => setForm((current) => ({ ...current, link_url: event.target.value }))} placeholder="https://..." />
              <Input label="Button Label" value={form.link_button_text ?? ""} onChange={(event) => setForm((current) => ({ ...current, link_button_text: event.target.value }))} placeholder="e.g. View Details" />
            </div>
          </div>
        </div>

        {/* Step 3: Targeting */}
        <div className="bg-panel rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">3. Audience & Display</h3>
              <p className="text-sm text-muted">Who should see this and for how long?</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 mb-5">
            <Select
              label="Target Audience"
              value={form.audience}
              onChange={(v) => setForm((current) => ({ ...current, audience: v as any, target_group: v, target: v.toUpperCase() }))}
              options={[
                { value: "all", label: "👥 All Students" },
                { value: "new", label: "👋 New Students (< 7 days)" },
                { value: "premium", label: "⭐ Premium Members" },
                { value: "free", label: "🆓 Free Students" },
                { value: "pending", label: "⏳ Pending Students" },
                { value: "expired", label: "⚠️ Expired Students" },
                { value: "suspended", label: "🚫 Suspended Students" },
                { value: "selected", label: "🎯 Selected Students..." },
              ]}
            />
            <Select
              label="Display Behavior"
              value={form.display_mode}
              onChange={(v) => setForm((current) => ({ ...current, display_mode: v as any }))}
              options={[
                { value: "persistent", label: "📌 Persistent (Stays until dismissed)" },
                { value: "one_time", label: "👀 One Time (Disappears after seen)" },
                { value: "recurring", label: "🔄 Recurring Daily" },
              ]}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {form.display_mode === "recurring" && (
              <TimeInput label="Daily Time to Show" value={form.recurring_time ?? ""} onChange={(e) => setForm((curr) => ({ ...curr, recurring_time: e.target.value }))} />
            )}
            <DateInput label="Related Event Date (Optional)" value={form.event_date ?? ""} onChange={(event) => setForm((current) => ({ ...current, event_date: event.target.value }))} />
          </div>

          {form.audience === "selected" && (
            <div className="mt-6 border border-border/80 rounded-2xl overflow-hidden flex flex-col max-h-[350px] shadow-sm bg-background/50">
              <div className="p-4 border-b border-border/80 bg-panel/80 backdrop-blur-sm">
                <Input label="Search Students" hideLabel placeholder="🔍 Search by name..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
              </div>
              <div className="overflow-y-auto p-2">
                {allStudents.isLoading && <div className="p-8 text-center text-sm font-medium text-muted animate-pulse">Loading student database...</div>}
                {(allStudents?.data ?? [])
                  .filter(s => (s?.first_name || "").toLowerCase().includes((studentSearch || "").toLowerCase()) || (s?.last_name || "").toLowerCase().includes((studentSearch || "").toLowerCase()))
                  .map(student => (
                    <div key={student?.id} onClick={() => toggleStudent(student?.id)} className="flex items-center justify-between p-3 hover:bg-panel rounded-xl cursor-pointer transition-colors mb-1 group">
                      <div className="flex items-center gap-4">
                        <Avatar src={student.profile_image} name={`${student.first_name} ${student.last_name}`} size="md" />
                        <div>
                          <div className="text-sm font-bold text-foreground">{student.first_name} {student.last_name}</div>
                          <div className="text-[11px] font-medium text-muted mt-0.5">ID: {student.id}</div>
                        </div>
                      </div>
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${selectedStudentIds.includes(student.id) ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30' : 'border-border group-hover:border-primary/50 text-transparent'}`}>
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
              </div>
              <div className="p-3 border-t border-border/80 bg-panel text-sm font-semibold flex justify-between items-center">
                <span className="text-muted-foreground ml-2">Selected Students</span>
                <Badge variant="info" className="rounded-full px-3 py-1 font-bold">{(selectedStudentIds ?? []).length}</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Timing */}
        <div className="bg-panel rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">4. Delivery Timing</h3>
              <p className="text-sm text-muted">When should this notification go out?</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => {
                setDeliveryMethod("now");
                setForm(curr => ({ ...curr, scheduled_at: "" }));
              }}
              className={`relative overflow-hidden flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center transition-all ${
                deliveryMethod === "now"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border/60 bg-background/50 text-muted hover:border-primary/40 hover:bg-panel-strong"
              }`}
            >
              {deliveryMethod === "now" && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full -z-10" />}
              <Send className={`mb-2 h-6 w-6 transition-transform ${deliveryMethod === "now" ? "text-primary scale-110" : "text-muted-foreground"}`} />
              <span className="font-bold text-[14px]">Send Right Now</span>
              <span className="text-[12px] mt-1 opacity-80 font-medium">Immediate delivery</span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod("later")}
              className={`relative overflow-hidden flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center transition-all ${
                deliveryMethod === "later"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border/60 bg-background/50 text-muted hover:border-primary/40 hover:bg-panel-strong"
              }`}
            >
              {deliveryMethod === "later" && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full -z-10" />}
              <CalendarPlus className={`mb-2 h-6 w-6 transition-transform ${deliveryMethod === "later" ? "text-primary scale-110" : "text-muted-foreground"}`} />
              <span className="font-bold text-[14px]">Schedule for Later</span>
              <span className="text-[12px] mt-1 opacity-80 font-medium">Pick a specific date & time</span>
            </button>
          </div>

          {deliveryMethod === "later" && (
            <div className="mb-2 bg-background/50 p-6 rounded-2xl border border-primary/20 shadow-inner animate-in fade-in slide-in-from-top-4">
              <p className="text-sm font-bold mb-5 text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary"/> Choose Schedule</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <DateInput 
                  label="Exact Date & Time" 
                  showTime 
                  value={form.scheduled_at ?? ""} 
                  onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))} 
                />
                <DateInput 
                  label="Auto-Expire (Optional)" 
                  showTime 
                  value={form.expires_at ?? ""} 
                  onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} 
                />
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-4 z-10 bg-panel/90 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="hidden sm:block pl-2">
            <p className="text-sm font-bold text-foreground">Ready to go?</p>
            <p className="text-xs font-medium text-muted mt-0.5">Double check your message preview on the right before sending.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <label className="flex items-center gap-2 cursor-pointer bg-green-500/10 text-green-600 px-4 py-2 rounded-xl border border-green-500/20 hover:bg-green-500/20 transition-colors">
              <input 
                type="checkbox" 
                checked={form.send_whatsapp || false}
                onChange={(e) => setForm(c => ({...c, send_whatsapp: e.target.checked}))}
                className="w-4 h-4 rounded border-green-500/30 text-green-600 focus:ring-green-500/50"
              />
              <span className="font-bold text-sm">Send via WhatsApp</span>
            </label>
            {deliveryMethod === "later" ? (
              <Button 
                type="submit" 
                variant="primary" 
                size="md"
                className="w-full sm:w-auto shadow-primary/40 shadow-xl rounded-xl px-8 h-10 text-[14px] font-bold"
                loading={schedule.isPending} 
                icon={<CalendarPlus className="h-4 w-4" />} 
                disabled={!form.scheduled_at || !canCreate}
              >
                Confirm & Schedule
              </Button>
            ) : (
              <Button 
                type="submit" 
                variant="primary" 
                size="md"
                className="w-full sm:w-auto shadow-primary/40 shadow-xl rounded-xl px-8 h-10 text-[14px] font-bold"
                loading={send.isPending} 
                icon={<Send className="h-4 w-4" />} 
                disabled={!canCreate}
              >
                Send Broadcast Now
              </Button>
            )}
          </div>
        </div>
      </form>
      
      <div className="flex flex-col gap-6">
        <section className="sticky top-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-xl text-foreground">Live Preview</h2>
            <Badge variant="neutral" className="text-xs font-bold rounded-full px-3 py-1 bg-background/50 border-border/80">Mobile View</Badge>
          </div>
          <MobilePreview />
        </section>
      </div>
    </div>
  );
}
