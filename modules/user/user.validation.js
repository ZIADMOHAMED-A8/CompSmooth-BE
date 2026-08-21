import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("A valid email is required."),
    name: z.string().trim().min(1, "Name is required."),
    password: z.string().min(8, "Password must be at least 8 characters."),
  }),
});
