import { createHash } from "node:crypto";
import { rateLimit } from "express-rate-limit";

function rateLimitResponse(res) {
  return res.status(429).json({
    success: false,
    message: "Too many verification code requests. Please try again later.",
  });
}

function resetEmailKey(req) {
  const emailHash = createHash("sha256")
    .update(req.body.email)
    .digest("hex");

  return `PASSWORD_RESET:${emailHash}`;
}

const commonOptions = {
  legacyHeaders: false,
  standardHeaders: true,
  handler: (req, res) => rateLimitResponse(res),
};

export const otpRequestIpLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

export const passwordResetEmailCooldownLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000,
  limit: 1,
  keyGenerator: resetEmailKey,
  skip: (req) => req.body.purpose !== "PASSWORD_RESET",
});

export const passwordResetEmailWindowLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: resetEmailKey,
  skip: (req) => req.body.purpose !== "PASSWORD_RESET",
});
