import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["patient", "doctor"]).default("patient"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const patientRegisterSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^\+?[1-9]\d{1,14}$/, "Phone must be in E.164 format (e.g. +919876543210 or +12345678901)"),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date of birth (YYYY-MM-DD)"),
  sex: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Please select sex" }),
  }),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], {
    errorMap: () => ({ message: "Please select blood group" }),
  }),
});

export type PatientRegisterInput = z.infer<typeof patientRegisterSchema>;

export const doctorRegisterSchema = z.object({
  full_name: z.string().min(2, "Doctor name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^\+?[1-9]\d{1,14}$/, "Phone must be in E.164 format (e.g. +919876543210 or +12345678901)"),
  license_no: z.string().min(3, "Medical registration / license number is required"),
  hospital: z.string().min(2, "Hospital or practice name is required"),
});

export type DoctorRegisterInput = z.infer<typeof doctorRegisterSchema>;

/**
 * Generates a random 12-character base32 Health ID as required by project spec.
 * Uses Crockford's base32 alphabet (no I, L, O, U to prevent visual confusion).
 */
export function generateHealthId(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let result = "";
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    result += alphabet[randomIndex];
  }
  return result;
}
