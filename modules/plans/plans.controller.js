import { Router } from "express";
import { getPlans } from "./plans.service";

const router=Router()

router.get('/',getPlans)

export default router