import { z } from "zod/v4";

export const butlerContentSchema = z.object({
  hero: z.object({
    headline: z.string().min(1, "Headline is required"),
    subheading: z.string().min(1, "Subheading is required"),
  }),
  trustIndicators: z.array(z.string()),
  commonRequests: z.array(z.string()),
});

export type ButlerContent = z.infer<typeof butlerContentSchema>;
