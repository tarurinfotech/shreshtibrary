"use client";

import { FormEvent, useState, useRef, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarPlus, Send, Trash2, Users, Image as ImageIcon, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EntityListItem } from "@/components/ui/EntityListItem";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { DateInput, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, LoadingBlock } from "@/components/ui/StateBlocks";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { getErrorMessage } from "@/lib/api";
import { endpoints, type NotificationPayload } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { NotificationRecord, StudentProfile } from "@/types/api";

const emptyNotification: NotificationPayload = {
  title: "",
  body: "",
  type: "GENERAL",
  target: "ALL",
  target_group: "all",
  send_push: true,
  send_email: false,
  send_sms: false,
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

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [tab, setTab] = useState<"send" | "template" | "history" | "scheduled">("send");
  const [form, setForm] = useState<NotificationPayload>(emptyNotification);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [selected, setSelected] = useState<NotificationRecord | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  
  // Selected IDs string processing to Array and vice versa
  const settings = useQuery({ queryKey: ["settings"], queryFn: endpoints.settings });
  
  const [expiryTitle, setExpiryTitle] = useState("");
  const [expiryMessage, setExpiryMessage] = useState("");

  useEffect(() => {
    if (settings.data) {
      setExpiryTitle(settings.data.expiry_dialog_title || "Plan Expired");
      setExpiryMessage(settings.data.expiry_dialog_message || "Your plan has expired.");
    }
  }, [settings.data]);

  const updateSettings = useMutation({
    mutationFn: () => endpoints.updateSettings({ ...settings.data, expiry_dialog_title: expiryTitle, expiry_dialog_message: expiryMessage }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      pushToast({ kind: "success", title: "Template updated successfully" });
    },
    onError: (e) => pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(e) }),
  });

  const selectedStudentIds = useMemo(() => {
    if (!form.selected_students) return [];
    return form.selected_students.split(',').map(s => parseInt(s.trim())).filter(id => !isNaN(id));
  }, [form.selected_students]);

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

  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => endpoints.notifications({ page_size: 50 }) });
  const scheduled = useQuery({ queryKey: ["scheduled-notifications"], queryFn: endpoints.scheduledNotifications });
  const templates = useQuery({ queryKey: ["notification-templates"], queryFn: endpoints.notificationTemplates });
  const allStudents = useQuery({ queryKey: ["all-students"], queryFn: () => endpoints.allStudents() });
  const recipients = useQuery({
    queryKey: ["notification-recipients", selected?.id],
    queryFn: () => endpoints.notificationRecipients(selected?.id ?? 0),
    enabled: Boolean(selected),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["scheduled-notifications"] });
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

  const cancel = useMutation({
    mutationFn: (id: number) => endpoints.cancelScheduledNotification(id),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Schedule cancelled" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Cancel failed", message: getErrorMessage(error) }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (tab === "template") {
      updateSettings.mutate();
    } else if (tab === "scheduled" || form.scheduled_at) {
      schedule.mutate();
    } else {
      send.mutate();
    }
  };

  const notificationColumns: Array<DataTableColumn<NotificationRecord>> = [
    {
      id: "message",
      header: "Message",
      cell: (item) => (
        <>
          <div className="font-medium">{item.title}</div>
          <div className="text-xs text-muted">{item.body}</div>
        </>
      ),
    },
    { id: "target", header: "Target", cell: (item) => item.target_group },
    { id: "recipients", header: "Recipients", cell: (item) => <Badge variant="info">{item.success_count}/{item.total_recipients}</Badge> },
    { id: "sent", header: "Sent", cell: (item) => formatDateTime(item.sent_at ?? item.created_at) },
    {
      id: "action",
      header: "Action",
      cell: (item) => <Button size="sm" variant="secondary" icon={<Users className="h-4 w-4" />} onClick={() => setSelected(item)}>Recipients</Button>,
    },
  ];

  // Mobile Preview Component
  const MobilePreview = () => {
    const bgUrl = backgroundImage ? URL.createObjectURL(backgroundImage) : null;
    const galleryUrls = galleryImages.map(f => URL.createObjectURL(f));

    return (
      <div className="sticky top-6 rounded-[2.5rem] border-8 border-slate-900 bg-slate-100 overflow-hidden shadow-2xl h-[700px] w-full flex flex-col items-center justify-center relative">
        <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-2xl w-32 mx-auto z-50"></div>
        
        {/* Mock Notification Display */}
        <div className="w-full h-full p-4 overflow-y-auto pt-10 text-slate-800 relative">
          <div className="text-center text-xs text-slate-500 mb-6">Shresht Library App Preview</div>
          
          <div className="mb-4">
            <h2 className="text-xl font-bold">Hello, Student</h2>
            <p className="text-xs text-slate-500">Welcome back to the library</p>
          </div>

          <div className="w-full h-32 bg-slate-200 rounded-xl mb-4 flex items-center justify-center text-slate-400 text-sm font-medium">
            (Home Slider Carousel)
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h3 className="font-bold text-sm mb-3">Today</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><Check className="w-4 h-4 text-green-600" /></div>
                <div>
                  <div className="text-xs text-slate-500">Attendance</div>
                  <div className="text-sm font-semibold">Marked today</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><div className="w-4 h-4 bg-blue-600 rounded-sm" /></div>
                <div>
                  <div className="text-xs text-slate-500">Active plan</div>
                  <div className="text-sm font-semibold">Premium Monthly</div>
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="font-bold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 pb-8">
             <div className="bg-slate-200/50 p-3 rounded-lg text-center text-xs font-semibold text-slate-600 border border-slate-200">Study</div>
             <div className="bg-slate-200/50 p-3 rounded-lg text-center text-xs font-semibold text-slate-600 border border-slate-200">Plans</div>
          </div>

          {/* Centered Modal Overlay Preview */}
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 rounded-[2.2rem]">
            <div className="relative w-full max-w-sm mt-4">
              
              {tab === "template" ? (
                // Expiry Dialog Template Preview
                <div className="rounded-2xl overflow-hidden shadow-2xl bg-white relative">
                  <div className="h-32 bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                    <span className="text-white text-5xl">⚠️</span>
                  </div>
                  <div className="p-5 relative z-10 text-slate-900">
                    <h4 className="font-bold text-lg leading-tight text-center">{expiryTitle || "Plan Expired"}</h4>
                    <p className="text-[13px] mt-3 leading-relaxed text-center text-slate-600">
                      {expiryMessage || "Your plan has expired. Please renew to continue using premium features."}
                    </p>
                    <div className="mt-5">
                      <div className="w-full text-center px-4 py-3 rounded-full text-sm font-bold shadow-sm bg-primary text-white">
                        Renew Plan
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Standard Notification Preview
                <div className={`rounded-2xl overflow-hidden shadow-2xl relative ${form.layout === 'background_image' ? 'bg-slate-900 relative' : 'bg-white'}`}>
                  
                  {form.layout === 'background_image' && bgUrl && (
                    <>
                      <img src={bgUrl} alt="bg" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60"></div>
                    </>
                  )}

                  <div className={`p-5 relative z-10 ${form.layout === 'background_image' ? 'text-white' : 'text-slate-900'}`}>
                    
                    {form.layout === 'full_image' && galleryUrls.length > 0 && (
                      <img src={galleryUrls[0]} alt="gallery" className="w-full h-40 rounded-xl mb-4 object-cover shadow-sm" />
                    )}
                    {form.layout === 'half_image' && galleryUrls.length > 0 && (
                      <img src={galleryUrls[0]} alt="gallery" className="w-full h-28 object-cover rounded-xl mb-4 shadow-sm" />
                    )}

                    <h4 className="font-bold text-lg leading-tight text-center">{form.title || "Notification Title"}</h4>
                    
                    {form.subtitle && (
                      <p className={`text-sm mt-1 text-center font-medium ${form.layout === 'background_image' ? 'text-amber-300' : 'text-primary'}`}>{form.subtitle}</p>
                    )}
                    
                    <p className={`text-[13px] mt-3 leading-relaxed text-center ${form.layout === 'background_image' ? 'text-slate-200' : 'text-slate-600'}`}>
                      {form.body || "Notification body text goes here..."}
                    </p>
                    
                    {(form.link_url || form.link_button_text) && (
                      <div className="mt-5">
                        <div className={`w-full text-center px-4 py-3 rounded-full text-sm font-bold shadow-sm ${form.layout === 'background_image' ? 'bg-white text-slate-900' : 'bg-primary text-white'}`}>
                          {form.link_button_text || "YAY!"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Close Button overlapping top right */}
              {tab !== "template" && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 cursor-pointer z-30 text-slate-500">
                  <X className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Notifications" eyebrow="Broadcast" />
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "send", label: "Send" },
          { value: "template", label: "Expiry Template" },
          { value: "history", label: "History" },
          { value: "scheduled", label: "Scheduled" },
        ]}
      />

      {tab !== "history" && tab !== "scheduled" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <FormShell surface onSubmit={submit}>
            {tab === "template" ? (
              <div className="grid gap-6">
                <div className="text-sm text-slate-500 mb-2">
                  Customize the message that students see when their plan expires. They will be locked out of premium features until they renew.
                </div>
                <Input 
                  label="Dialog Title" 
                  value={expiryTitle} 
                  onChange={(e) => setExpiryTitle(e.target.value)} 
                  required 
                />
                <Textarea 
                  label="Dialog Message" 
                  value={expiryMessage} 
                  onChange={(e) => setExpiryMessage(e.target.value)} 
                  rows={4}
                  required 
                />
                <FormActions>
                  <Button type="submit" variant="primary" loading={updateSettings.isPending}>
                    Save Template
                  </Button>
                </FormActions>
              </div>
            ) : (
              <>
            <div className="mb-6 grid gap-3">
              <label className="text-sm font-semibold">Layout Style</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { value: "text_only", label: "Text Only" },
                  { value: "half_image", label: "Half Image" },
                  { value: "full_image", label: "Full Image" },
                  { value: "background_image", label: "Background" },
                ].map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setForm((curr) => ({ ...curr, layout: l.value }))}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                      form.layout === l.value
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-panel text-muted hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <ImageIcon className="h-5 w-5" />
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <h3 className="font-semibold border-b pb-2 mb-4">Content</h3>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <Input label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
              <Input label="Subtitle (Optional)" value={form.subtitle ?? ""} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} />
            </div>

            <Textarea label="Body / Short Message" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} required />
            <Textarea label="Rich Description (Optional)" value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 mt-4">
              <Input label="Link URL" type="url" value={form.link_url ?? ""} onChange={(event) => setForm((current) => ({ ...current, link_url: event.target.value }))} placeholder="https://" />
              <Input label="Link Button Text" value={form.link_button_text ?? ""} onChange={(event) => setForm((current) => ({ ...current, link_button_text: event.target.value }))} placeholder="e.g. Open Link" />
            </div>

            {form.layout === "background_image" && (
              <div className="mb-6 bg-panel p-4 rounded-lg border">
                <label className="mb-2 block text-sm font-semibold">Background Image</label>
                <input type="file" accept="image/*" onChange={(e) => setBackgroundImage(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:px-4 file:py-2 file:font-semibold hover:file:bg-primary/80 cursor-pointer" />
              </div>
            )}

            {(form.layout === "half_image" || form.layout === "full_image") && (
              <div className="mb-6 bg-panel p-4 rounded-lg border">
                <label className="mb-2 block text-sm font-semibold">Gallery Images</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setGalleryImages(Array.from(e.target.files ?? []))} className="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:px-4 file:py-2 file:font-semibold hover:file:bg-primary/80 cursor-pointer" />
                {galleryImages.length > 0 && <p className="mt-2 text-xs font-medium text-primary">{galleryImages.length} image(s) selected</p>}
              </div>
            )}

            <h3 className="font-semibold border-b pb-2 mb-4 mt-8">Targeting & Scheduling</h3>
            <FormGrid columns={2}>
              <Select
                label="Audience Segment"
                value={form.audience}
                onChange={(v) => setForm((current) => ({ ...current, audience: v, target_group: v, target: v.toUpperCase() }))}
                options={[
                  { value: "all", label: "All Students" },
                  { value: "new", label: "New Students (< 7 days)" },
                  { value: "premium", label: "Premium (Active Plan)" },
                  { value: "non_premium", label: "Non-Premium" },
                  { value: "expired", label: "Expired Plan" },
                  { value: "selected", label: "Selected Students" },
                ]}
              />
              <Select
                label="Display Mode"
                value={form.display_mode}
                onChange={(v) => setForm((current) => ({ ...current, display_mode: v }))}
                options={[
                  { value: "persistent", label: "Persistent (until dismissed)" },
                  { value: "one_time", label: "One Time (remove after seen)" },
                  { value: "recurring", label: "Recurring Daily" },
                ]}
              />

              {form.display_mode === "recurring" && (
                <Input label="Recurring Time" type="time" value={form.recurring_time ?? ""} onChange={(e) => setForm((curr) => ({ ...curr, recurring_time: e.target.value }))} />
              )}
              <DateInput label="Event Date" value={form.event_date ?? ""} onChange={(event) => setForm((current) => ({ ...current, event_date: event.target.value }))} />
            </FormGrid>

            {form.audience === "selected" && (
              <div className="mt-4 mb-6 border rounded-lg overflow-hidden flex flex-col max-h-[300px]">
                <div className="p-3 border-b bg-panel">
                  <Input label="Search Students" hideLabel placeholder="Search by name..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                </div>
                <div className="overflow-y-auto p-2">
                  {allStudents.isLoading && <div className="p-4 text-center text-sm text-muted">Loading students...</div>}
                  {(allStudents.data || [])
                    .filter(s => s.first_name.toLowerCase().includes(studentSearch.toLowerCase()) || s.last_name.toLowerCase().includes(studentSearch.toLowerCase()))
                    .map(student => (
                      <div key={student.id} onClick={() => toggleStudent(student.id)} className="flex items-center justify-between p-2 hover:bg-panel rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar src={student.profile_image} name={`${student.first_name} ${student.last_name}`} size="sm" />
                          <div>
                            <div className="text-sm font-medium">{student.first_name} {student.last_name}</div>
                            <div className="text-xs text-muted">ID: {student.id}</div>
                          </div>
                        </div>
                        {selectedStudentIds.includes(student.id) && <Check className="w-5 h-5 text-primary" />}
                      </div>
                    ))}
                </div>
                <div className="p-2 border-t bg-panel-strong text-xs font-medium">
                  {selectedStudentIds.length} student(s) selected
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-6">
              <DateInput label="Schedule Publish (Optional)" showTime value={form.scheduled_at ?? ""} onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))} />
              <DateInput label="Schedule Expiry (Optional)" showTime value={form.expires_at ?? ""} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} />
            </div>

            <FormActions className="mt-8">
              <Button type="submit" loading={send.isPending || schedule.isPending} icon={form.scheduled_at ? <CalendarPlus className="h-4 w-4" /> : <Send className="h-4 w-4" />}>
                {form.scheduled_at ? "Schedule" : "Send"} Notification
              </Button>
            </FormActions>
            </>
            )}
          </FormShell>
          
          <div className="flex flex-col gap-6">
            <section>
              <h2 className="mb-4 font-semibold text-lg">Live Preview</h2>
              <MobilePreview />
            </section>
            <section className="surface h-fit rounded-lg p-5">
              <h2 className="mb-4 font-semibold">Templates</h2>
              <div className="grid gap-2">
                {(templates.data ?? []).map((template) => (
                  <button key={template.id} className="rounded-lg border border-border bg-panel-strong p-3 text-left text-sm" onClick={() => setForm((current) => ({ ...current, title: template.title, body: template.body }))}>
                    <span className="font-medium">{template.title}</span>
                    <span className="mt-1 block text-xs text-muted">{template.body}</span>
                  </button>
                ))}
                {(templates.data ?? []).length === 0 ? <EmptyState title="No templates configured" /> : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <DataTable
          data={notifications.data?.data ?? []}
          columns={notificationColumns}
          getRowKey={(item) => item.id}
          loading={notifications.isLoading}
          error={notifications.error ? "Unable to load notifications." : false}
          emptyTitle="No notifications found"
        />
      ) : null}

      {tab === "scheduled" ? (
        <section className="surface rounded-lg p-5">
          <h2 className="mb-4 font-semibold">Scheduled Queue</h2>
          <div className="grid gap-3">
            {(scheduled.data ?? []).map((item) => (
              <EntityListItem
                key={item.id}
                title={item.title}
                meta={formatDateTime(item.scheduled_at)}
                actions={<Button size="sm" variant="danger" loading={cancel.isPending} icon={<Trash2 className="h-4 w-4" />} onClick={() => cancel.mutate(item.id)}>Cancel</Button>}
              />
            ))}
            {(scheduled.data ?? []).length === 0 ? <EmptyState title="No scheduled notifications" /> : null}
          </div>
        </section>
      ) : null}

      <Modal open={Boolean(selected)} title="Recipients" onClose={() => setSelected(null)}>
        {recipients.isLoading ? <LoadingBlock label="Loading recipients" /> : null}
        <div className="grid gap-2">
          {(recipients.data ?? []).map((item) => (
            <EntityListItem
              key={item.id}
              title={item.student_name}
              trailing={<Badge variant={item.is_read ? "success" : "warning"}>{item.is_read ? "Read" : "Unread"}</Badge>}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}
