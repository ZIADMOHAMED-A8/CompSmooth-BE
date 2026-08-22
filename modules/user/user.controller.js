import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { login, register } from "./user.service.js";
import { loginSchema, registerSchema } from "./user.validation.js";

const router = Router();

router.post("/signup", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

export default router;
