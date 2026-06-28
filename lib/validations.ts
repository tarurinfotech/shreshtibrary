import { z } from "zod";

export const studentPayloadSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters"),
  middle_name: z.string().max(50, "Middle name cannot exceed 50 characters").optional().or(z.literal("")).nullable(),
  last_name: z.string().max(50, "Last name cannot exceed 50 characters").optional().or(z.literal("")).nullable(),
  email: z
    .string()
    .email("A valid email is required")
    .optional()
    .or(z.literal(""))
    .nullable(),
  mobile: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "A valid mobile number is required")
    .optional()
    .or(z.literal(""))
    .nullable(),
  is_active: z.boolean().optional().nullable(),
  goal: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  caste: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  parent_mobile: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "A valid mobile number is required")
    .optional()
    .or(z.literal(""))
    .nullable(),
  status: z.enum(["LIVE", "EXPIRED", "SUSPENDED"]).optional().nullable(),
  preferred_language: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
});

export const seatCreateSchema = z.object({
  floor: z.string().min(1, "Floor is required."),
  row: z.string().min(1, "Row is required."),
  seat_number: z.string().min(1, "Seat number is required."),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_reserved_for_girls: z.boolean().optional().nullable(),
  row_ref_id: z.number().optional().nullable(),
});

export const planCreateSchema = z.object({
  name: z.string().min(1, "Name is required.").max(100, "Name cannot exceed 100 characters."),
  duration_months: z.number().min(0, "Duration in months must be between 0 and 120.").max(120, "Duration in months must be between 0 and 120."),
  duration_days: z.number().min(0, "Duration in days must be between 0 and 3650.").max(3650, "Duration in days must be between 0 and 3650.").optional().nullable(),
  price: z.number().min(0, "Price must be between 0 and 1000000.").max(1000000, "Price must be between 0 and 1000000."),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  benefits: z.array(z.string()).optional(),
  sort_order: z.number().optional().nullable(),
});

// Helper function to extract Zod errors to a flat map
export function getZodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(error.flatten().fieldErrors)) {
    if (Array.isArray(value) && value.length > 0) {
      fieldErrors[key] = String(value[0]);
    }
  }
  return fieldErrors;
}
