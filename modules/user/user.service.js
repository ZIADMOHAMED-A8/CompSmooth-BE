import { compare } from "bcryptjs";
import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../utils/AppError.js";
import { compareToken, hashPassword, hashToken } from "../../utils/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";

function serializeUser(user) {
  const { password, refresh_token, ...safeUser } = user;
  return safeUser;
}

export async function register(req, res) {
  const result = await registerUser(req.body);

  res.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: result,
  });
}

export async function registerUser(input) {
  const existingUser = await prisma.users.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AppError("Email is already registered.", 409);
  }

  const hashedPassword = await hashPassword(input.password);
  const freePlanId = process.env.FREE_PLAN_ID;

  if (!freePlanId) {
    throw new AppError("FREE_PLAN_ID is not configured.", 500);
  }

  const freePlan = await prisma.plans.findUnique({
    where: { id: freePlanId },
    select: { id: true },
  });

  if (!freePlan) {
    throw new AppError("Configured free plan does not exist.", 500);
  }

  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
      },
    });

    await tx.subscriptions.create({
      data: {
        userId: user.id,
        planId: freePlanId,
        startDate: new Date(),
        expirationDate: null,
        status: "ACTIVE",
      },
    });

    return user;
  });

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);

  const refreshToken = generateRefreshToken({
    userId: user.id,
  });

  const hashedRefreshToken = await hashToken(refreshToken);

  await prisma.users.update({
    where: { id: user.id },
    data: {
      refresh_token: hashedRefreshToken,
    },
  });

  return {
    user: serializeUser(user),
    accessToken,
    refreshToken,
  };
}

// function getUserPlan(user) {
//   const [userPlan] = user.subscriptions;
//   user.plan = userPlan ? userPlan.plan.plan : "FREE";
//   return user;
// }

export async function login(req, res) {
  const data = req.body;
  const now = new Date();

  let existingUser = await prisma.users.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
      createdAt: true,
      updatedAt: true,
      subscriptions: {
        where: {
          status: "ACTIVE",
          OR: [{ expirationDate: null }, { expirationDate: { gt: now } }],
        },
        orderBy: {
          expirationDate: "desc",
        },
        take: 1,
        select: {
          plan: {
            select: {
              plan: true,
              monthly_request_limit: true,
            },
          },
        },
      },
    },
  });
  console.log(existingUser);

  if (!existingUser) {
    throw new AppError("User does not exist.", 404);
  }

  const passwordsMatching = await compare(
    data.password,
    existingUser.password
  );

  if (!passwordsMatching) {
    throw new AppError("Wrong password.", 400);
  }

  // existingUser = getUserPlan(existingUser);

  const tokenPayload = {
    userId: existingUser.id,
    email: existingUser.email,
    role: existingUser.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({
    userId: existingUser.id,
  });

  const hashedRefreshToken = await hashToken(refreshToken);

  await prisma.users.update({
    where: { id: existingUser.id },
    data: { refresh_token: hashedRefreshToken },
  });

  const user = serializeUser(existingUser);

  res.status(200).json({
    success: true,
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
}

export async function refreshToken(req, res) {
  const { refreshToken: token } = req.body;
  const payload = verifyRefreshToken(token);

  if (!payload || typeof payload !== "object" || !payload.userId) {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  const user = await prisma.users.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      refresh_token: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || !user.refresh_token) {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  const tokenMatches = await compareToken(token, user.refresh_token);

  if (!tokenMatches) {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken({
    userId: user.id,
  });

  await prisma.users.update({
    where: { id: user.id },
    data: {
      refresh_token: await hashToken(newRefreshToken),
    },
  });

  res.status(200).json({
    success: true,
    data: {
      user: serializeUser(user),
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
}
