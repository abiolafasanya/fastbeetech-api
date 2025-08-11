import * as z from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z
    .string()
    .min(10, "Minimum lenth of phone number is 10 digit")
    .max(15, "Maximum length of phone number is 15 digit"),
  discipline: z.enum(["Software Engineering", "Graphics Design"]),
  experience: z.enum(["Beginner", "Intermediate", "Advanced"]),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  resumeUrl: z.string().url().optional().or(z.literal("")), // if you upload and pass URL
});

export type IApplication = z.infer<typeof schema>;
export default schema; // export the schema

