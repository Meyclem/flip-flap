import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { errorHandler } from "../../src/middleware/error-handler.middleware";
import { asyncHandler } from "../../src/utils/async-handler";
import {
  BadGatewayError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  NotImplementedError,
  UnauthorizedError,
} from "../../src/utils/errors";

describe("Error Handler Middleware", () => {
  const createTestApp = (errorToThrow: Error) => {
    const app = express();
    app.use(express.json());

    app.get(
      "/test",
      asyncHandler(() => {
        throw errorToThrow;
      }),
    );

    app.use(errorHandler);
    return app;
  };

  describe("Custom Error Classes", () => {
    it("should handle BadRequestError with 400 status", async () => {
      const app = createTestApp(new BadRequestError("Invalid input"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        title: "Bad Request",
        detail: "Invalid input",
        instance: "/test",
      });
      expect(response.body.type).toContain("400");
    });

    it("should handle UnauthorizedError with 401 status", async () => {
      const app = createTestApp(new UnauthorizedError("Not authenticated"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        title: "Unauthorized",
        detail: "Not authenticated",
        instance: "/test",
      });
      expect(response.body.type).toContain("401");
    });

    it("should handle ForbiddenError with 403 status", async () => {
      const app = createTestApp(new ForbiddenError("Access denied"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        title: "Forbidden",
        detail: "Access denied",
        instance: "/test",
      });
      expect(response.body.type).toContain("403");
    });

    it("should handle NotFoundError with 404 status", async () => {
      const app = createTestApp(new NotFoundError("Resource not found"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        title: "Not Found",
        detail: "Resource not found",
        instance: "/test",
      });
      expect(response.body.type).toContain("404");
    });

    it("should handle ConflictError with 409 status", async () => {
      const app = createTestApp(new ConflictError("Resource already exists"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        title: "Conflict",
        detail: "Resource already exists",
        instance: "/test",
      });
      expect(response.body.type).toContain("409");
    });

    it("should handle NotImplementedError with 501 status", async () => {
      const app = createTestApp(new NotImplementedError("Feature not implemented"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(501);
      expect(response.body).toMatchObject({
        title: "Not Implemented",
        detail: "Feature not implemented",
        instance: "/test",
      });
      expect(response.body.type).toContain("501");
    });

    it("should handle BadGatewayError with 502 status", async () => {
      const app = createTestApp(new BadGatewayError("Upstream service error"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(502);
      expect(response.body).toMatchObject({
        title: "Bad Gateway",
        detail: "Upstream service error",
        instance: "/test",
      });
      expect(response.body.type).toContain("502");
    });

    it("should handle InternalServerError with 500 status", async () => {
      const app = createTestApp(new InternalServerError("Server error"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        title: "Internal Server Error",
        detail: "Server error",
        instance: "/test",
      });
      expect(response.body.type).toContain("500");
    });
  });

  describe("Zod Validation Errors", () => {
    it("should handle ZodError with 400 status and formatted details", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const zodError = schema.safeParse({ name: 123, age: "invalid" }).error!;
      const app = createTestApp(zodError);

      const response = await request(app).get("/test");

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        title: "Bad Request",
        instance: "/test",
      });
      expect(response.body.detail).toBeInstanceOf(Array);
      expect(response.body.detail).toEqual(
        expect.arrayContaining([
          expect.stringContaining("name:"),
          expect.stringContaining("age:"),
        ]),
      );
    });

    it("should handle ZodError with nested path", async () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const zodError = schema.safeParse({ user: { email: "invalid" } }).error!;
      const app = createTestApp(zodError);

      const response = await request(app).get("/test");

      expect(response.status).toBe(400);
      expect(response.body.detail).toEqual(
        expect.arrayContaining([expect.stringContaining("user.email:")]),
      );
    });
  });

  describe("Generic Errors", () => {
    it("should handle generic Error with 500 status and hide error details", async () => {
      const app = createTestApp(new Error("Something went wrong"));

      const response = await request(app).get("/test");

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        title: "Internal Server Error",
        detail: "An unexpected error occurred.",
        instance: "/test",
      });
      expect(response.body.type).toContain("500");
      expect(response.body.detail).not.toContain("Something went wrong");
    });

    it("should handle unknown error types with 500 status", async () => {
      const app = express();
      app.use(express.json());

      app.get("/test", () => {
        // eslint-disable-next-line no-throw-literal
        throw "string error";
      });

      app.use(errorHandler);

      const response = await request(app).get("/test");

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        title: "Internal Server Error",
        detail: "An unexpected error occurred.",
        instance: "/test",
      });
    });
  });

  describe("Error with cause", () => {
    it("should handle errors with cause property", async () => {
      const causeError = new Error("Root cause");
      const error = new BadRequestError("Validation failed");
      error.cause = causeError;

      const app = createTestApp(error);

      const response = await request(app).get("/test");

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        title: "Bad Request",
        detail: "Validation failed",
      });
    });
  });

  describe("Response format", () => {
    it("should return RFC 7807 Problem Details format", async () => {
      const app = createTestApp(new NotFoundError("Not found"));

      const response = await request(app).get("/test");

      expect(response.headers["content-type"]).toContain("application/problem+json");
      expect(response.body).toHaveProperty("type");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("detail");
      expect(response.body).toHaveProperty("instance");
    });

    it("should include MDN documentation link in type field", async () => {
      const app = createTestApp(new NotFoundError("Not found"));

      const response = await request(app).get("/test");

      expect(response.body.type).toBe("https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404");
    });
  });
});
