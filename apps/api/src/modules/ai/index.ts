import { Router } from "express";

import chatRoutes from "./chat/chat.routes";
import requirementRoutes from "./requirements/requirement.routes";

const router = Router();

router.use("/chat", chatRoutes);
router.use("/requirements", requirementRoutes);

export default router;