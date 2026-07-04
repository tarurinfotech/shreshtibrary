"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";;
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints, type StudentCreatePayload } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";

import { studentPayloadSchema, getZodFieldErrors } from "@/lib/validations";

const emptyStudent: StudentCreatePayload = {
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  goal: "Other",
  gender: "Male",
  parent_mobile: "",
  address: "",
};

interface StudentCreateFormProps {
  open: boolean;
  onClose: () => void;
}

export function StudentCreateForm({ open, onClose }: StudentCreateFormProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [form, setForm] = useState<StudentCreatePayload>(emptyStudent);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: () => endpoints.createStudent(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["student-counts"] });
      setForm(emptyStudent);
      setFormErrors({});
      onClose();
      pushToast({ kind: "success", title: "Student created" });
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error);
      setFormErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) {
        pushToast({ kind: "error", title: "Create failed", message: getErrorMessage(error) });
      }
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Zod Validation
    const result = studentPayloadSchema.safeParse(form);
    
    if (!result.success) {
      setFormErrors(getZodFieldErrors(result.error));
      return;
    }

    setFormErrors({});
    create.mutate();
  };

  return (
    <Modal open={open} title="Add Student" onClose={onClose}>
      <FormShell onSubmit={submit} noValidate>
        <FormGrid columns={2}>
          <Input
            label="First Name"
            value={form.first_name ?? ""}
            onChange={(e) => setForm((c) => ({ ...c, first_name: e.target.value }))}
            error={formErrors.first_name}
            required
          />
          <Input
            label="Last Name"
            value={form.last_name ?? ""}
            onChange={(e) => setForm((c) => ({ ...c, last_name: e.target.value }))}
            error={formErrors.last_name}
          />
          <Input
            label="Mobile"
            value={form.mobile}
            onChange={(e) => {
              setForm((c) => ({ ...c, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }));
              if (formErrors.mobile) setFormErrors((errs) => ({ ...errs, mobile: "" }));
            }}
            required
            pattern="[0-9]{10}"
            title="Mobile number must be exactly 10 digits"
            maxLength={10}
            minLength={10}
            error={formErrors.mobile}
          />
          <Input
            label="Email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
            error={formErrors.email}
          />
          <Input
            label="Goal"
            value={form.goal ?? ""}
            onChange={(e) => setForm((c) => ({ ...c, goal: e.target.value }))}
            error={formErrors.goal}
          />
          <Select
            label="Gender"
            value={form.gender ?? "Male"}
            onChange={(v) => setForm((c) => ({ ...c, gender: v }))}
            options={[
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
            ]}
          />
          <Input
            label="Parent Mobile"
            value={form.parent_mobile ?? ""}
            onChange={(e) => setForm((c) => ({ ...c, parent_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
            pattern="[0-9]{10}"
            title="Parent mobile number must be exactly 10 digits"
            maxLength={10}
            minLength={10}
            error={formErrors.parent_mobile}
          />
          <Input
            label="Password"
            type="password"
            value={form.password ?? ""}
            onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
            error={formErrors.password}
          />
        </FormGrid>
        <Input
          label="Address"
          value={form.address ?? ""}
          onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
          error={formErrors.address}
        />
        <FormActions>
          <Button type="submit" loading={create.isPending} icon={<Plus className="h-4 w-4" />}>
            Create Student
          </Button>
        </FormActions>
      </FormShell>
    </Modal>
  );
}
