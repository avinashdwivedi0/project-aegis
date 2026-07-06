import { NextFunction, Request, Response } from "express";
import { ZodError, ZodTypeAny } from "zod";

type ValidationSchema = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export function validate(schema: ValidationSchema) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
     if (schema.body) {
      req.body = schema.body.parse(req.body);
    }

     if (schema.params) {
      req.params = schema.params.parse(
      req.params
     ) as Request["params"];
   }

     if (schema.query) {
      req.query = schema.query.parse(
      req.query
      ) as Request["query"];
}

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message:
            error.issues[0]?.message ??
            "Validation failed",
          errors: error.flatten().fieldErrors,
        });
      }

      next(error);
    }
  };
}