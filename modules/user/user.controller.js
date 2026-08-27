import { Router } from "express";
import asyncWrapper from "../../middlewares/asyncWrapper.js";
import validate from "../../middlewares/validate.js";
import {
  createCheckoutSession,
  login,
  refreshToken,
  register,
} from "./user.service.js";
import {
  createCheckoutSessionSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "./user.validation.js";
import { prisma } from "../../lib/prisma.js";
import authorize from "../../middlewares/authorize.js";
import { decodeAccessToken } from "../../utils/decodeToken.js";
const router = Router();

router.post("/signup", validate(registerSchema), asyncWrapper(register));
router.post("/login", validate(loginSchema), asyncWrapper(login));
router.post(
  "/create-checkout-session",
  validate(createCheckoutSessionSchema),
  asyncWrapper(createCheckoutSession)
);
router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  asyncWrapper(refreshToken)
);
router.post(
  "/test",
  authorize(["USER"]),
  asyncWrapper(async (req, res) => {
    console.time("RAW_USER");
    const obj = decodeAccessToken(req);
    console.log(obj);
    const user = await prisma.$queryRaw`
      SELECT *
      FROM "Users"
      WHERE email = ${"ziad@gmail.com"}
      LIMIT 1
    `;

    console.timeEnd("RAW_USER");
    res.status(200).json(user);
  })
);
export default router;
