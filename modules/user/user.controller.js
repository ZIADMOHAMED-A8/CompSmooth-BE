import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { login, register } from "./user.service.js";
import { loginSchema, registerSchema } from "./user.validation.js";
import { prisma } from "../../lib/prisma.js";
const router = Router();

router.post("/signup", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post('/test',async (req,res,next)=>{
    console.time("RAW_USER");

const user = await prisma.$queryRaw`
  SELECT *
  FROM "Users"
  WHERE email = ${'ziad@gmail.com'}
  LIMIT 1
`;

console.timeEnd("RAW_USER");
res.status(200).json(user)
})
export default router;
