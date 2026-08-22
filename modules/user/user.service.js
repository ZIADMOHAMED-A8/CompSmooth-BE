import { compare } from "bcryptjs";
import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../utils/AppError.js";
import { hashPassword, hashToken } from "../../utils/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/jwt.js";

function serializeUser(user) {
  const { password, refresh_token, ...safeUser } = user;
  return safeUser;
}

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
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
    user: serializeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function login(req, res, next) {
  try {
    const data = req.body;
    const existingUser = await prisma.users.findUnique({
      where: { email: data.email },
    });

    if (!existingUser) {
      return next(new AppError("User does not exist.", 404));
    }

    const passwordsMatching = await compare(data.password, existingUser.password);

    if (!passwordsMatching) {
      return next(new AppError("Wrong password.", 400));
    }

    const tokenPayload = {
      userId: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: existingUser.id });
    const hashedRefreshToken = await hashToken(refreshToken);

    await prisma.users.update({
      where: { id: existingUser.id },
      data: { refresh_token: hashedRefreshToken },
    });

    res.status(200).json({
      success: true,
      data: {
        user: serializeUser(existingUser),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}
