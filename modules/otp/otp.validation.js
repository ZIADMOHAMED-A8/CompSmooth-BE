import { z } from "zod";

const otpPurposeSchema = z.enum([
  "SIGN_UP",
  "PASSWORD_RESET",
  "EMAIL_VERIFICATION",
]);

const emailSchema = z.string().trim().toLowerCase().email("A valid email is required.");

export const requestOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
    purpose: otpPurposeSchema,
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
    purpose: otpPurposeSchema,
    otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code."),
  }),
});
