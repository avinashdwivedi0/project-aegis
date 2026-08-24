import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { validate } from "../../../middleware/validate.middleware";

import { ChatController } from "./chat.controller";
import { chatSchema } from "./chat.schema";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(chatSchema),
  ChatController.chat,
);

export default router;