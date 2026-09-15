import { z } from "zod";

const text = (label: string, min = 2) => z.string().trim().min(min, `${label} is required.`).max(4000);
const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const website = z.string().trim().url("Enter a complete website address, including https://.");

export const enterpriseInquirySchema = z.object({
  businessName: text("Business name"), contactName: text("Contact name"), email,
  phone: text("Mobile number", 6), website, locations: text("Locations"),
  monthlyVolume: text("Monthly volume"), cadence: text("Publishing cadence"),
  services: z.array(z.string()).min(1, "Choose at least one service."), goals: text("Goals", 10),
  currentMarketing: text("Current marketing", 5), integrations: z.string().trim().max(4000).default(""),
  budget: text("Budget"), timeline: text("Timeline"), notes: z.string().trim().max(4000).default(""),
  privacyConsent: z.literal(true, { errorMap: () => ({ message: "Consent is required to process your inquiry." }) }),
});

type Failure = { success: false; errors: Record<string, string> };
function validate<T>(schema: z.ZodType<T>, input: unknown): { success: true; data: T } | Failure {
  const result = schema.safeParse(input);
  if (result.success) return result;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) errors[String(issue.path[0] ?? "form")] ||= issue.message;
  return { success: false, errors };
}

export const validateEnterpriseInquiry = (input: unknown) => validate(enterpriseInquirySchema, input);