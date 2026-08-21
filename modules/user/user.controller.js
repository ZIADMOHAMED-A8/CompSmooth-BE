import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { registerUser } from "./user.service.js";
import { registerSchema } from "./user.validation.js";

const router = Router();

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

router.post("/register", validate(registerSchema), register);
router.post("/signup", validate(registerSchema), register);

export default router;
