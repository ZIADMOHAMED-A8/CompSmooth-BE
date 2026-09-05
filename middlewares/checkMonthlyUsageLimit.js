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
    console.log(user,"user u")
    if (!user) {
      throw new AppError("User does not exist.", 404);
    }

   
    const monthlyLimit = user.subscriptions.plan.monthly_request_limit

    if (monthlyLimit <= 0) {
      throw new AppError("Monthly request limit has been reached.", 429);
    }
    console.log(user.subscriptions.plan.id=== Number(process.env.FREE_PLAN_ID), "zzzz")
    console.log(user.subscriptions.plan.id)
    console.log( Number(process.env.FREE_PLAN_ID))

    
    const monthlyUsage = await prisma.usage_logs.count({
      where: {
        userId,
        createdAt: {
          gte:Number(user.subscriptions.plan.id)=== Number(process.env.FREE_PLAN_ID) ? getMonthStart(now) :  user.subscriptions.startDate,
        },
      },
    });
    const monthlyUsaget = await prisma.usage_logs.findMany({
      where: {
        userId,
        createdAt: {
          gte:user.subscriptions.plan.id=== Number(process.env.FREE_PLAN_ID) ? getMonthStart(now) :  user.subscriptions.startDate,
        },
      },
    });
    console.log(monthlyUsaget  )

    console.log(monthlyUsaget.length  )
    if (monthlyUsage >= monthlyLimit) {
      throw new AppError("Monthly request limit has been reached.", 429);
    }

    req.subscription = user.subscriptions;
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