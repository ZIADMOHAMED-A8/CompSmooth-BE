import { AppError } from "../utils/AppError.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isJwtError =
    err.name === "JsonWebTokenError" || err.name === "TokenExpiredError";
  const statusCode = isJwtError ? 401 : err instanceof AppError ? err.statusCode : 500;
  const message = isJwtError
    ? "Invalid or expired refresh token."
    : err instanceof AppError
      ? err.message
      : "Internal server error";

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}
