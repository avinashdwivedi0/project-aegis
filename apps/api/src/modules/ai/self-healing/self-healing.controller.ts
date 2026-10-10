import type {
  NextFunction,
  Response,
} from "express";

import type { AuthenticatedRequest } from "../../../middleware/auth.middleware";
import { selfHealingService } from "./self-healing.service";
import { manualSelfHealingValidationSchema } from "./self-healing.types";

type ProposalParams = { proposalId: string };

export class SelfHealingController {
  static async propose(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const proposal = await selfHealingService.propose(
        req.user.userId,
        req.body,
      );
      return res.status(200).json({
        success: true,
        message: "Self-healing proposal queued for review.",
        data: proposal,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { repositoryId, status } = req.query;
      const proposals = await selfHealingService.list(
        req.user.userId,
        typeof repositoryId === "string" ? repositoryId : undefined,
        status === "PENDING" ||
          status === "APPROVED" ||
          status === "REJECTED" ||
          status === "VALIDATING" ||
          status === "VALIDATED" ||
          status === "ROLLED_BACK"
          ? status
          : undefined,
      );
      return res.status(200).json({
        success: true,
        data: proposals,
      });
    } catch (error) {
      next(error);
    }
  }

  static async review(
    req: AuthenticatedRequest<ProposalParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const status = req.body.status;
      if (status !== "APPROVED" && status !== "REJECTED") {
        return res.status(400).json({
          success: false,
          message: "Review status must be APPROVED or REJECTED.",
        });
      }

      const proposal = await selfHealingService.review(
        req.user.userId,
        req.params.proposalId,
        status,
      );
      return res.status(200).json({
        success: true,
        message: `Self-healing proposal ${status.toLowerCase()}.`,
        data: proposal,
      });
    } catch (error) {
      next(error);
    }
  }

  static async validate(
    req: AuthenticatedRequest<ProposalParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validation = manualSelfHealingValidationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Only the test runner can record a successful validation. Users may explicitly roll back an approved proposal.",
        });
      }

      const proposal = await selfHealingService.validate(
        req.user.userId,
        req.params.proposalId,
        validation.data.passed,
        validation.data.reason,
      );
      return res.status(200).json({
        success: true,
        message: "Self-healing proposal rolled back.",
        data: proposal,
      });
    } catch (error) {
      next(error);
    }
  }

  static async retry(
    req: AuthenticatedRequest<ProposalParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const proposal = await selfHealingService.retry(
        req.user.userId,
        req.params.proposalId,
      );
      return res.status(200).json({
        success: true,
        message: "Self-healing proposal requeued for review.",
        data: proposal,
      });
    } catch (error) {
      next(error);
    }
  }
}
