import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { successResponse } from "../../utils/response";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  AuthenticatedRequest,
} from "../../middleware/auth.middleware";
import { ApiError } from "../../utils/ApiError";

export class AuthController {
  static register = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await AuthService.register(req.body);

      return successResponse(
        res,
        "User registered successfully",
        result,
        201
      );
    }
  );

  static login = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await AuthService.login(req.body);

      return successResponse(
        res,
        "Login successful",
        result
      );
    }
  );

  static me = asyncHandler(
    async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        throw new ApiError(401, "Unauthorized");
      }

      const user = await AuthService.getCurrentUser(
        authReq.user.userId
      );

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      return successResponse(
        res,
        "User fetched successfully",
        user
      );
    }
  );
}