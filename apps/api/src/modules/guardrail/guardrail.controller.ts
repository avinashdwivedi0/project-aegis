import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

import { GuardrailService } from "./guardrail.service";

export class GuardrailController {
  static get = asyncHandler<AuthenticatedRequest<{ id: string }>>(
    async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
      const settings = await GuardrailService.get(req.params.id, req.user.userId);
      return successResponse(res, "Guardrail settings retrieved.", settings);
    }
  );

  static upsert = asyncHandler<AuthenticatedRequest<{ id: string }>>(
    async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
      const settings = await GuardrailService.upsert(req.params.id, req.user.userId, req.body);
      return successResponse(
        res,
        "Guardrail settings saved.",
        settings,
        201
      );
    }
  );
}
