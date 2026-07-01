"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DateInput, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import type { StudentUpdatePayload } from "@/lib/endpoints";
import type { StudentProfile } from "@/types/api";

import { studentPayloadSchema, getZodFieldErrors } from "@/lib/validations";

const goals = ["UPSC", "GPSC", "CONSTABLE", "Banking", "Army", "Teacher", "Railway", "SSC", "CA", "Other"];

export function StudentEditForm({
  student,
  saving,
  onSubmit,
}: {
  student: StudentProfile;
  saving: boolean;
  onSubmit: (payload: StudentUpdatePayload) => void;
}) {
  const [form, setForm] = useState<StudentUpdatePayload>({
    first_name: student.first_name,
    middle_name: student.middle_name,
    last_name: student.last_name,
    email: student.email,
    mobile: student.mobile,
    is_active: student.is_active,
    goal: student.goal,
    dob: student.dob,
    gender: student.gender,
    caste: student.caste,
    address: student.address,
    parent_mobile: student.parent_mobile,
    status: student.status,
    preferred_language: student.preferred_language,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const goalOptions = goals.includes(String(form.goal)) ? goals : [String(form.goal), ...goals];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = studentPayloadSchema.safeParse(form);
    
    if (!result.success) {
      setFormErrors(getZodFieldErrors(result.error));
      return;
    }

    setFormErrors({});
    onSubmit(form);
  };

  return (
    <FormShell surface onSubmit={submit}>
      <FormGrid columns={2}>
        <Input label="First Name" value={form.first_name ?? ""} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} error={formErrors.first_name} />
        <Input label="Middle Name" value={form.middle_name ?? ""} onChange={(event) => setForm((current) => ({ ...current, middle_name: event.target.value }))} error={formErrors.middle_name} />
        <Input label="Last Name" value={form.last_name ?? ""} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} error={formErrors.last_name} />
        <Input label="Mobile" value={form.mobile ?? ""} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} error={formErrors.mobile} />
        <Input label="Email" type="email" value={form.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} error={formErrors.email} />
        <Input label="Parent Mobile" value={form.parent_mobile ?? ""} onChange={(event) => setForm((current) => ({ ...current, parent_mobile: event.target.value }))} error={formErrors.parent_mobile} />
        <DateInput label="Date of Birth" value={form.dob ?? ""} onChange={(event) => setForm((current) => ({ ...current, dob: event.target.value }))} error={formErrors.dob} />
        <Select
          label="Gender"
          value={form.gender ?? "Male"}
          onChange={(v) => setForm((current) => ({ ...current, gender: v }))}
          options={[
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
          ]}
        />
        <Select
          label="Goal"
          value={form.goal ?? "Other"}
          onChange={(v) => setForm((current) => ({ ...current, goal: v }))}
          options={goalOptions.map((goal) => ({ value: goal, label: goal }))}
        />
        <Select
          label="Profile Status"
          value={form.status ?? "LIVE"}
          onChange={(v) => setForm((current) => ({ ...current, status: v as StudentProfile["status"] }))}
          options={[
            { value: "LIVE", label: "Live" },
            { value: "EXPIRED", label: "Expired" },
            { value: "SUSPENDED", label: "Suspended" },
          ]}
        />
        <Input label="Caste" value={form.caste ?? ""} onChange={(event) => setForm((current) => ({ ...current, caste: event.target.value }))} error={formErrors.caste} />
        <Input label="Language" value={form.preferred_language ?? "en"} onChange={(event) => setForm((current) => ({ ...current, preferred_language: event.target.value }))} error={formErrors.preferred_language} />
      </FormGrid>
      <Textarea label="Address" value={form.address ?? ""} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} error={formErrors.address} />
      <FormActions>
        <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>
          Save Changes
        </Button>
      </FormActions>
    </FormShell>
  );
}
