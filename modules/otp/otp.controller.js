import { Router } from "express";
import asyncWrapper from "../../middlewares/asyncWrapper.js";
import validate from "../../middlewares/validate.js";
import { requestOtp, verifyOtp } from "./otp.service.js";
import { requestOtpSchema, verifyOtpSchema } from "./otp.validation.js";
import {
  otpRequestIpLimiter,
  passwordResetEmailCooldownLimiter,
  passwordResetEmailWindowLimiter,
} from "./otp.rate-limit.js";

const router = Router();

router.post(
  "/request",
  validate(requestOtpSchema),
  otpRequestIpLimiter,
  passwordResetEmailCooldownLimiter,
  passwordResetEmailWindowLimiter,
  asyncWrapper(requestOtp)
);
router.post("/verify", validate(verifyOtpSchema), asyncWrapper(verifyOtp));

export default router;
