import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { ErrorResponse } from "@/types/error.js";
import {
  BadGatewayError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  NotImplementedError,
  UnauthorizedError,
} from "@/utils/errors.js";

function apiErrorResponse(response: Response, status: number, error: ErrorResponse) {
  response
    .status(status)
    .contentType("application/problem+json")
    .send({
      type: error.type ?? `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${status}`,
      title: error.title,
      detail: error.detail,
      instance: error.instance,
    });
}

function handleError(error: Error, request: Request, response: Response, statusCode: number, title: string) {
  const detail
    = error instanceof z.ZodError
      ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      : error.message;
  const logMessage = Array.isArray(detail) ? detail.join(", ") : detail;
  if (error.cause) {
    console.error(`${title}: ${logMessage}`, { error: error.cause });
  } else {
    console.error(`${title}: ${logMessage}`);
  }
  return apiErrorResponse(response, statusCode, {
    title,
    instance: request.url,
    detail,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(error: Error, request: Request, response: Response, _next: NextFunction) {
  if (error instanceof z.ZodError) {
    return handleError(error, request, response, 400, "Bad Request");
  }

  if (error instanceof BadRequestError) {
    return handleError(error, request, response, 400, "Bad Request");
  }

  if (error instanceof UnauthorizedError) {
    return handleError(error, request, response, 401, "Unauthorized");
  }

  if (error instanceof ForbiddenError) {
    return handleError(error, request, response, 403, "Forbidden");
  }

  if (error instanceof NotFoundError) {
    return handleError(error, request, response, 404, "Not Found");
  }

  if (error instanceof ConflictError) {
    return handleError(error, request, response, 409, "Conflict");
  }

  if (error instanceof NotImplementedError) {
    return handleError(error, request, response, 501, "Not Implemented");
  }

  if (error instanceof BadGatewayError) {
    return handleError(error, request, response, 502, "Bad Gateway");
  }

  if (error instanceof InternalServerError) {
    return handleError(error, request, response, 500, "Internal Server Error");
  }

  if (error instanceof TypeError && error.message === "fetch failed") {
    if (error.cause instanceof AggregateError) {
      const cause = error.cause.errors.map((causeError) => causeError.message).join(", ");
      console.error(`Fetch error: ${cause}`);
    } else if (error.cause instanceof Error) {
      console.error(`Fetch error: ${error.cause.message}`);
    }
  } else if (typeof error === "object" && error && "code" in error) {
    console.error("Unexpected error", { error });
  }

  if (error instanceof Error) {
    console.error("Unexpected error:", error.message);
    return apiErrorResponse(response, 500, {
      title: "Internal Server Error",
      detail: "An unexpected error occurred.",
      instance: request.url,
    });
  }

  console.error("unexpected error: ", { error: { message: "Unknown error" } });

  return apiErrorResponse(response, 500, {
    title: "Internal Server Error",
    detail: "An unexpected error occurred.",
    instance: request.url,
  });
}
