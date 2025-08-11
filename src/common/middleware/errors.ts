import { NextFunction, Request, Response } from "express";
import { TokenExpiredError } from "jsonwebtoken";
import logger from "./logger";

export class CustomError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestException extends CustomError {
  constructor(message = "Bad Request", statusCode = 400) {
    super(message, statusCode);
  }
}

export class UnauthorizedException extends CustomError {
  constructor(message = "Unauthorized", statusCode = 401) {
    super(message, statusCode);
  }
}

export class NotFoundException extends CustomError {
  constructor(message = "Not Found", statusCode = 404) {
    super(message, statusCode);
  }
}

export class ConflictException extends CustomError {
  constructor(message = "Conflict", statusCode = 409) {
    super(message, statusCode);
  }
}

export class ServerException extends CustomError {
  constructor(message = "Internal Server Error", statusCode = 500) {
    super(message, statusCode);
  }
}

export function ServeError(error: unknown) {
  if (error instanceof Error) {
    const err = error as Error & { statusCode: number };
    throw new BadRequestException(err.message, err.statusCode || 400);
  }
}

export function AppErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!err) {
    logger.error("AppErrorHandler was called with undefined error.");
    return res.status(500).json({ message: "Unexpected error" });
  }

  if (err instanceof TokenExpiredError) {
    logger.warn("JWT token expired");
    return res
      .status(401)
      .json({ message: "Your token has expired. Please log in again" });
  }

  if (err instanceof CustomError) {
    logger.warn(`CustomError: ${err.message}`);
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof Error) {
    const e = err as Error & { statusCode?: number };
    const stack = e?.stack || "No stack trace";
    console.error(`Unhandled Error: ${e.message}\nStack: ${stack}`);
    return res.status(e.statusCode || 400).json({ message: e.message });
  }

  logger.error(`Unknown error object: ${JSON.stringify(err)}`);
  return res.status(500).json({ message: "Something went wrong" });
}
