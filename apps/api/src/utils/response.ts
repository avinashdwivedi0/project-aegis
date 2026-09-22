import { Response } from "express";

export function successResponse(
  res: Response,
  messageOrData: string | unknown,
  dataOrMessage: unknown = null,
  status = 200
) {
  const message = typeof messageOrData === "string"
    ? messageOrData
    : typeof dataOrMessage === "string"
      ? dataOrMessage
      : "";
  const data = typeof messageOrData === "string"
    ? dataOrMessage
    : messageOrData;

  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  message: string,
  status = 400
) {
  return res.status(status).json({
    success: false,
    message,
  });
}