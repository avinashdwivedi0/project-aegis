import { Router } from "express";

import chatRoutes from "./chat/chat.routes";
import requirementRoutes from "./requirements/requirement.routes";
import testDesignRoutes from "./test-design/test-design.routes";
import scriptGeneratorRoutes from "./script-generation/script-generator.routes";
import testRunnerRoutes from "./test-runner/test-runner.routes";
import selfHealingRoutes from "./self-healing/self-healing.routes";
import failureTriageRoutes from "./failure-triage/failure-triage.routes";
import testReportRoutes from "./test-report/test-report.routes";
import testWorkflowRoutes from "./test-workflow/test-workflow.routes";

const router = Router();

router.use("/chat", chatRoutes);
router.use("/requirements", requirementRoutes);
router.use("/test-designs", testDesignRoutes);
router.use("/script-generators", scriptGeneratorRoutes);
router.use("/test-runs", testRunnerRoutes);
router.use("/self-healing", selfHealingRoutes);
router.use("/failure-triage", failureTriageRoutes);
router.use("/test-reports", testReportRoutes);
router.use("/test-workflows", testWorkflowRoutes);

export default router;