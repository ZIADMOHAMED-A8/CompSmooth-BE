import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";

const SALT_ROUNDS = 12;
const OTP_SALT_ROUNDS = 10;
const TOKEN_HASH_ALGORITHM = "sha256";

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, OTP_SALT_ROUNDS);
}

export async function compareOtp(otp, hashedOtp) {
  return bcrypt.compare(otp, hashedOtp);
}

export async function hashToken(token) {
  return createHash(TOKEN_HASH_ALGORITHM).update(token).digest("hex");
}

export async function compareToken(token, hashedToken) {
  const tokenHash = await hashToken(token);
  const tokenHashBuffer = Buffer.from(tokenHash, "hex");
  const hashedTokenBuffer = Buffer.from(hashedToken, "hex");

  if (tokenHashBuffer.length !== hashedTokenBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenHashBuffer, hashedTokenBuffer);
}
