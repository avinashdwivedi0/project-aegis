import {
  NextFunction,
  Request,
  Response,
} from "express";

import { chatService } from "./chat.service";

export class ChatController {
  static async chat(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const response =
        await chatService.chat(req.body);

      return res.status(200).json({
        success: true,
        message: "Chat response generated successfully.",
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}