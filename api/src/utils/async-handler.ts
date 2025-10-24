import type { NextFunction, Request, Response } from "express";

export function asyncHandler(
  fn: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(fn(request, response, next)).catch(next);
  };
}
