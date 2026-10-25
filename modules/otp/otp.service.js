import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../utils/AppError.js";
import { compareOtp, hashOtp } from "../../utils/hash.js";
import { sendOtpEmail } from "../../utils/email.js";
import { generateOtpVerificationToken } from "../../utils/jwt.js";

const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;
const OTP_REQUEST_COOLDOWN_SECONDS = 60;
const OTP_TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable",
  maxWait: 10000,
  timeout: 10000,
};

function generateOtp() {
  return randomInt(100000, 1000000).toString();
}

function sendPasswordResetRequestResponse(res, expiresAt) {
  return res.status(200).json({
    success: true,
    message:
      "If an account exists with this email, a verification code has been sent.",
    data: { expiresAt },
  });
}

export async function requestOtp(req, res) {
  const { email: destination, purpose } = req.body;
  const isPasswordReset = purpose === "PASSWORD_RESET";
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (isPasswordReset) {
    const user = await prisma.users.findUnique({
      where: { email: destination },
      select: { id: true },
    });

    if (!user) {
      return sendPasswordResetRequestResponse(res, expiresAt);
    }
  }

  const requestCutoff = new Date(
    Date.now() - OTP_REQUEST_COOLDOWN_SECONDS * 1000
  );
  const codeHash = await hashOtp(otp);

  const otpRecord = await prisma.$transaction(
    async (tx) => {
      const recentOtp = await tx.oTPs.findFirst({
        where: {
          destination,
          purpose,
          createdAt: { gt: requestCutoff },
        },
        select: { id: true },
      });

      if (recentOtp) {
        throw new AppError(
          "Please wait before requesting another verification code.",
          429
        );
      }

      await tx.oTPs.updateMany({
        where: {
          destination,
          purpose,
          consumedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: new Date() },
      });

      return tx.oTPs.create({
        data: { destination, purpose, codeHash, expiresAt },
        select: { id: true },
      });
    },
    OTP_TRANSACTION_OPTIONS
  );

  try {
    await sendOtpEmail({
      email: destination,
      otp,
      purpose,
      expiresAt,
      otpId: otpRecord.id,
    });
  } catch (error) {
    await prisma.oTPs.update({
      where: { id: otpRecord.id },
      data: { invalidatedAt: new Date() },
    });

    if (isPasswordReset) {
      console.error("Password reset OTP delivery failed.", error);
      return sendPasswordResetRequestResponse(res, expiresAt);
    }

    throw error;
  }

  const data = {
    expiresAt,
    ...(!isPasswordReset && process.env.EXPOSE_OTP_FOR_DEVELOPMENT === "true"
      ? { otp }
      : {}),
  };

  res.status(isPasswordReset ? 200 : 201).json({
    success: true,
    message: isPasswordReset
      ? "If an account exists with this email, a verification code has been sent."
      : "Verification code generated successfully.",
    data,
  });
}

export async function verifyOtp(req, res) {
  const { email: destination, purpose, otp: code } = req.body;
  const now = new Date();
  const verificationToken = generateOtpVerificationToken({
    email: destination,
    purpose,
  });

  const verified = await prisma.$transaction(
    async (tx) => {
      const otp = await tx.oTPs.findFirst({
        where: {
          destination,
          purpose,
          expiresAt: { gt: now },
          consumedAt: null,
          invalidatedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!otp) {
        return false;
      }

      const codeMatches = await compareOtp(code, otp.codeHash);

      if (!codeMatches) {
        const attemptCount = otp.attemptCount + 1;

        await tx.oTPs.update({
          where: { id: otp.id },
          data: {
            attemptCount,
            ...(attemptCount >= MAX_OTP_ATTEMPTS
              ? { invalidatedAt: new Date() }
              : {}),
          },
        });

        return false;
      }

      const consumed = await tx.oTPs.updateMany({
        where: {
          id: otp.id,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: new Date() },
      });

      return consumed.count === 1;
    },
    OTP_TRANSACTION_OPTIONS
  );

  if (!verified) {
    throw new AppError("Invalid or expired verification code.", 400);
  }

  res.status(200).json({
    success: true,
    message: "Verification code confirmed successfully.",
    data: {
      verificationToken,
    },
  });
}
