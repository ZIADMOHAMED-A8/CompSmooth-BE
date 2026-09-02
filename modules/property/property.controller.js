import { Router } from "express";
import asyncWrapper from "../../middlewares/asyncWrapper.js";
import authorize from "../../middlewares/authorize.js";
import checkMonthlyUsageLimit from "../../middlewares/checkMonthlyUsageLimit.js";
import validate from "../../middlewares/validate.js";
import { runComps } from "./property.service.js";
import { runCompsSchema } from "./property.validation.js";

const router = Router();

const runCompsMiddlewares = [
  authorize(["USER"]),
  validate(runCompsSchema),
  checkMonthlyUsageLimit,
  asyncWrapper(runComps),
];

router.post("/property", runCompsMiddlewares);
router.post("/propety", runCompsMiddlewares);

export default router;
