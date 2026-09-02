import { compare } from "bcryptjs";
import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../utils/AppError.js";
import { compareToken, hashPassword, hashToken } from "../../utils/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import stripe from "../../utils/stripe.js";
import { decodeAccessToken } from "../../utils/decodeToken.js";
import { fetchUser } from "../../utils/fetchUser.js";
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

  let existingUser = await fetchUser({
    email:data.email
  })
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

function getCheckoutUrls(req) {
  const fallbackBaseUrl = `${req.protocol}://${req.get("host")}`;

  return {
    successUrl:
      process.env.STRIPE_SUCCESS_URL ||
      `${fallbackBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl:
      process.env.STRIPE_CANCEL_URL || `${fallbackBaseUrl}/checkout/cancel`,
  };
}

function buildLineItem(plan) {
  if (plan.price.startsWith("price_")) {
    return {
      price: plan.price,
      quantity: 1,
    };
  }

  const numericPrice = Number(plan.price);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    throw new AppError("Selected plan is not payable.", 400);
  }

  return {
    price_data: {
      currency: process.env.STRIPE_CURRENCY || "usd",
      product_data: {
        name: `${plan.plan} plan`,
      },
      recurring: {
        interval: "month",
      },
      unit_amount: Math.round(numericPrice * 100),
    },
    quantity: 1,
  };
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function unixToDate(timestamp) {
  return Number.isFinite(timestamp) ? new Date(timestamp * 1000) : null;
}

async function getSubscriptionPeriod(session) {
  if (!session.subscription) {
    return {
      startDate: new Date(),
      expirationDate: addMonths(new Date(), 1),
    };
  }

  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  const startDate =
    unixToDate(subscription.current_period_start) ||
    unixToDate(subscription.start_date) ||
    new Date();
  const expirationDate =
    unixToDate(subscription.current_period_end) || addMonths(startDate, 1);

  return {
    startDate,
    expirationDate,
  };
}

async function storeSuccessfulCheckout(session) {
  const userId = session.metadata?.userId || session.client_reference_id;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    throw new AppError(
      "Stripe checkout session is missing user or plan metadata.",
      400
    );
  }

  if (session.mode !== "subscription") {
    return;
  }

  if (session.payment_status && session.payment_status !== "paid") {
    return;
  }

  const [user, plan] = await Promise.all([
    prisma.users.findUnique({
      where: { id: userId },
      select: { id: true },
    }),
    prisma.plans.findUnique({
      where: { id: planId },
      select: { id: true },
    }),
  ]);

  if (!user || !plan) {
    throw new AppError(
      "Stripe checkout session references an unknown user or plan.",
      400
    );
  }

  const { startDate, expirationDate } = await getSubscriptionPeriod(session);

  await prisma.$transaction(async (tx) => {
    const existingPayment = await tx.payments.findUnique({
      where: { id: session.id },
      select: { id: true },
    });

    if (existingPayment) {
      return;
    }

    const activePaidSubscriptions = await tx.subscriptions.findMany({
      where: {
        userId,
        status: "ACTIVE",
        plan: {
          plan: {
            not: "FREE",
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (activePaidSubscriptions.length > 0) {
      await tx.subscriptions.updateMany({
        where: {
          id: {
            in: activePaidSubscriptions.map((subscription) => subscription.id),
          },
        },
        data: {
          status: "EXPIRED",
          expirationDate: new Date(),
        },
      });
    }

    await tx.subscriptions.create({
      data: {
        userId,
        planId,
        startDate,
        expirationDate,
        status: "ACTIVE",
      },
    });

    await tx.payments.create({
      data: {
        id: session.id,
        userId,
        amount: Math.round((session.amount_total ?? 0) / 100),
        status: session.payment_status || "paid",
      },
    });
  });
}

export async function createCheckoutSession(req, res) {
  const { planId } = req.body;
  const { userId } = decodeAccessToken(req);

  const [user, plan] = await Promise.all([
    prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    }),
    prisma.plans.findUnique({
      where: { id: planId },
      select: { id: true, plan: true, price: true },
    }),
  ]);

  if (!user) {
    throw new AppError("User does not exist.", 404);
  }

  if (!plan) {
    throw new AppError("Plan does not exist.", 404);
  }

  const { successUrl, cancelUrl } = getCheckoutUrls(req);
  const idempotencyKey = crypto.randomUUID()
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [buildLineItem(plan)],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
        },
      },
    },
    {
      idempotencyKey
    }
  );

  res.status(201).json({
    success: true,
    data: {
      sessionId: session.id,
      url: session.url,
    },
  });
}

export async function stripeWebhook(req, res) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError("STRIPE_WEBHOOK_SECRET is not configured.", 500);
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    throw new AppError("Missing Stripe signature.", 400);
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    throw new AppError(
      `Webhook signature verification failed: ${error.message}`,
      400
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await storeSuccessfulCheckout(event.data.object);
      break;
    default:
      break;
  }

  res.status(200).json({ received: true });
}
