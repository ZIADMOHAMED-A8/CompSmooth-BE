import "dotenv/config";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.access_secret_key;
const REFRESH_SECRET = process.env.refresh_secret_key;

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

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
