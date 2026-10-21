import { Resend } from "resend";
import { AppError } from "./AppError.js";

const OTP_PURPOSE_COPY = {
  SIGN_UP: "Complete your CompSmooth sign-up",
  PASSWORD_RESET: "Reset your CompSmooth password",
  EMAIL_VERIFICATION: "Verify your CompSmooth email address",
};

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new AppError("RESEND_API_KEY is not configured.", 500);
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOtpEmail({ email, otp, purpose, expiresAt, otpId }) {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new AppError("RESEND_FROM_EMAIL is not configured.", 500);
  }

  const action = OTP_PURPOSE_COPY[purpose];
  const expiresInMinutes = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - Date.now()) / 60000)
  );
  const resend = getResendClient();
  const { error } = await resend.emails.send(
    {
      from,
      to: [email],
      subject: `${otp} is your CompSmooth verification code`,
      text: `${action}. Your verification code is ${otp}. It expires in ${expiresInMinutes} minutes. Do not share this code.`,
      html: `<p>${action}.</p><p>Your verification code is:</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p><p>This code expires in ${expiresInMinutes} minutes. Do not share it with anyone.</p>`,
    },
    { idempotencyKey: `otp/${otpId}` }
  );

  if (error) {
    throw new AppError("Unable to send verification email.", 502);
  }
}
