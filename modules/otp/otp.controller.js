import { Router } from "express";
import asyncWrapper from "../../middlewares/asyncWrapper.js";
import validate from "../../middlewares/validate.js";
import { requestOtp, verifyOtp } from "./otp.service.js";
import { requestOtpSchema, verifyOtpSchema } from "./otp.validation.js";

const router = Router();

router.post("/request", validate(requestOtpSchema), asyncWrapper(requestOtp));
router.post("/verify", validate(verifyOtpSchema), asyncWrapper(verifyOtp));

export default router;
