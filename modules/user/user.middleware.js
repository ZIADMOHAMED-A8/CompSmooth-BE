import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../utils/AppError.js";
import { verifyOtpVerificationToken } from "../../utils/jwt.js";

function sendExistingSignupResponse(res) {
  return res.status(200).json({
    success: true,
    message: "If this email is eligible, your sign-up has been processed.",
  });
}

export async function checkSignupEmailAvailability(req, res, next) {
  let payload;

  try {
    payload = verifyOtpVerificationToken(req.body.verificationToken);
  } catch {
    return next(new AppError("Invalid or expired verification token.", 401));
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    payload.email !== req.body.email ||
    payload.purpose !== "SIGN_UP"
  ) {
    return next(
      new AppError("Verification token does not match this request.", 403)
    );
  }

  const user = await prisma.users.findUnique({
    where: { email: req.body.email },
    select: { id: true },
  });

  if (user) {
    return sendExistingSignupResponse(res);
  }

  next();
}
