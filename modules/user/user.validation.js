import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special symbol."
  );

export const registerSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("A valid email is required."),
    name: z.string().trim().min(1, "Name is required."),
    password: passwordSchema,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("A valid email is required."),
    password: passwordSchema,
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(1, "Refresh token is required."),
  }),
});

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    planId: z.string().trim().min(1, "Plan id is required."),
  }),
});
