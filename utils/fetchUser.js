import { prisma } from "../lib/prisma";




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

function getEffectiveSubscription(subscriptions) {
  return [...subscriptions].sort((a, b) => {
    const planRankDiff = getPlanRank(b) - getPlanRank(a);

    if (planRankDiff !== 0) {
      return planRankDiff;
    }

    return getExpirationTime(b) - getExpirationTime(a);
  })[0];
}


export async function fetchUser(data) {
  const existingUser = await prisma.users.findUnique({
    where: data.id
      ? { id: data.id }
      : { email: data.email },
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
          OR: [
            { expirationDate: null },
            { expirationDate: { gt: new Date() } },
          ],
        },
        select: {
          id: true,
          startDate: true,
          expirationDate: true,
          status: true,
          plan: {
            select: {
              id: true,
              plan: true,
              monthly_request_limit: true,
            },
          },
        },
      },
    },
  });
  return existingUser
}