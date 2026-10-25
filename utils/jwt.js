import "dotenv/config";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.access_secret_key;
const REFRESH_SECRET = process.env.refresh_secret_key;
const OTP_VERIFICATION_SECRET = process.env.otp_verification_token_secret;

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const OTP_VERIFICATION_TOKEN_EXPIRES_IN = "15m";
const OTP_VERIFICATION_TOKEN_AUDIENCE = "otp-verification";
const TOKEN_ISSUER = "compsmooth";

function assertSecrets() {
  if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error("JWT secret keys are missing from environment variables.");
  }
}

export function generateAccessToken(payload) {
  assertSecrets();
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function generateRefreshToken(payload) {
  assertSecrets();
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyRefreshToken(token) {
  assertSecrets();
  return jwt.verify(token, REFRESH_SECRET);
}

function assertOtpVerificationSecret() {
  if (!OTP_VERIFICATION_SECRET) {
    throw new Error(
      "OTP verification token secret is missing from environment variables."
    );
  }
}

export function generateOtpVerificationToken(payload) {
  assertOtpVerificationSecret();

  return jwt.sign(payload, OTP_VERIFICATION_SECRET, {
    algorithm: "HS256",
    audience: OTP_VERIFICATION_TOKEN_AUDIENCE,
    expiresIn: OTP_VERIFICATION_TOKEN_EXPIRES_IN,
    issuer: TOKEN_ISSUER,
  });
}

export function verifyOtpVerificationToken(token) {
  assertOtpVerificationSecret();

  return jwt.verify(token, OTP_VERIFICATION_SECRET, {
    algorithms: ["HS256"],
    audience: OTP_VERIFICATION_TOKEN_AUDIENCE,
    issuer: TOKEN_ISSUER,
  });
}
