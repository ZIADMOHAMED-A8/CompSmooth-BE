import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../utils/AppError.js";
import { hashPassword, hashToken } from "../../utils/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/jwt.js";

function sanitizeUser(user) {
  const { password, refresh_token, ...safeUser } = user;
  return safeUser;
}

export async function registerUser(input) {
  const existingUser = await prisma.users.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AppError("Email is already registered.", 409);
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.users.create({
    data: {
      email: input.email,
      name: input.name,
      password: hashedPassword,
    },
  });

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ userId: user.id });

  const hashedRefreshToken = await hashToken(refreshToken);

  await prisma.users.update({
    where: { id: user.id },
    data: { refresh_token: hashedRefreshToken },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}
