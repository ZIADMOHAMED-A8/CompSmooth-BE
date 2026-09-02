import { prisma } from "../lib/prisma.ts";
import { AppError } from "../utils/AppError.js";
import { decodeAccessToken } from "../utils/decodeToken.js";
import { fetchUser } from "../utils/fetchUser.js";

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default async function checkMonthlyUsageLimit(req, res, next) {
  try {
    const {userId} = decodeAccessToken(req)
    console.log(userId,"test test test")

    if (!userId) {
      throw new AppError("Authentication token is required.", 401);
    }

    const now = new Date();
    const user = await fetchUser({id:userId})

    if (!user) {
      throw new AppError("User does not exist.", 404);
    }

    const subscription = getEffectiveSubscription(user.subscriptions);

    if (!subscription) {
      throw new AppError("User does not have an active subscription.", 403);
    }

    const monthlyLimit = subscription.plan.monthly_request_limit;

    if (monthlyLimit <= 0) {
      throw new AppError("Monthly request limit has been reached.", 429);
    }

    const monthlyUsage = await prisma.usage_logs.count({
      where: {
        userId,
        createdAt: {
          gte: getMonthStart(now),
        },
      },
    });

    if (monthlyUsage >= monthlyLimit) {
      throw new AppError("Monthly request limit has been reached.", 429);
    }

    req.subscription = subscription;
    req.monthlyUsage = {
      used: monthlyUsage,
      limit: monthlyLimit,
      remaining: monthlyLimit - monthlyUsage,
    };

    next();
  } catch (error) {
    next(error);
  }
}

function getPlanRank(subscription) {
  switch (subscription.plan?.plan) {
    case "SUPER":
      return 3;
    case "PRO":
      return 2;
    case "FREE":
      return 1;
    default:
      return 0;
  }
}

function getExpirationTime(subscription) {
  return subscription.expirationDate
    ? subscription.expirationDate.getTime()
    : Number.MAX_SAFE_INTEGER;
}

function getEffectiveSubscription(subscriptions = []) {
  return [...subscriptions].sort((a, b) => {
    const planRankDiff = getPlanRank(b) - getPlanRank(a);

    if (planRankDiff !== 0) {
      return planRankDiff;
    }

    return getExpirationTime(b) - getExpirationTime(a);
  })[0];
}