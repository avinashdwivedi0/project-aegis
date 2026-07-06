import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import {
  loginSchema,
  registerSchema,
} from "./auth.schema";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  AuthController.register
);

router.post(
  "/login",
  validate(loginSchema),
  AuthController.login
);


router.get(
  "/me",
  authenticate,
  AuthController.me
);

export default router;