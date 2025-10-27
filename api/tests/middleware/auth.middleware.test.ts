import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticateApiKey } from "../../src/middleware/auth.middleware";
import { ApiKey } from "../../src/models/api-key.model";
import { UnauthorizedError } from "../../src/utils/errors";
import { setupTestDatabase } from "../setup-db";

describe("authenticateApiKey middleware", () => {
  setupTestDatabase();

  const mockRequest = () => ({
    headers: {},
  }) as unknown as Request;

  const mockResponse = () => {
    const response = {
      locals: {},
    } as unknown as Response;
    return response;
  };

  const mockNext = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Valid API key", () => {
    it("should attach organizationId and environment to response.locals", async () => {
      const organizationId = new Types.ObjectId();
      const apiKey = await ApiKey.create({
        organizationId,
        key: "test_abc123",
        environment: "production",
        description: "Test key",
      });

      const request = mockRequest();
      request.headers["x-api-key"] = apiKey.key;
      const response = mockResponse();

      await authenticateApiKey(request, response, mockNext);

      expect(response.locals.organizationId).toEqual(organizationId);
      expect(response.locals.environment).toBe("production");
      expect(mockNext).toHaveBeenCalledOnce();
    });

    it("should work with development environment", async () => {
      const organizationId = new Types.ObjectId();
      const apiKey = await ApiKey.create({
        organizationId,
        key: "deve_xyz789",
        environment: "development",
        description: "Dev key",
      });

      const request = mockRequest();
      request.headers["x-api-key"] = apiKey.key;
      const response = mockResponse();

      await authenticateApiKey(request, response, mockNext);

      expect(response.locals.organizationId).toEqual(organizationId);
      expect(response.locals.environment).toBe("development");
      expect(mockNext).toHaveBeenCalledOnce();
    });

    it("should work with staging environment", async () => {
      const organizationId = new Types.ObjectId();
      const apiKey = await ApiKey.create({
        organizationId,
        key: "stag_qwerty",
        environment: "staging",
        description: "Staging key",
      });

      const request = mockRequest();
      request.headers["x-api-key"] = apiKey.key;
      const response = mockResponse();

      await authenticateApiKey(request, response, mockNext);

      expect(response.locals.organizationId).toEqual(organizationId);
      expect(response.locals.environment).toBe("staging");
      expect(mockNext).toHaveBeenCalledOnce();
    });
  });

  describe("Multiple organizations", () => {
    it("should correctly identify different organizations", async () => {
      const org1 = new Types.ObjectId();
      const org2 = new Types.ObjectId();

      const apiKey1 = await ApiKey.create({
        organizationId: org1,
        key: "prod_org1key",
        environment: "production",
        description: "Org 1 key",
      });

      const apiKey2 = await ApiKey.create({
        organizationId: org2,
        key: "prod_org2key",
        environment: "production",
        description: "Org 2 key",
      });

      const request1 = mockRequest();
      request1.headers["x-api-key"] = apiKey1.key;
      const response1 = mockResponse();

      await authenticateApiKey(request1, response1, mockNext);

      expect(response1.locals.organizationId).toEqual(org1);
      expect(response1.locals.environment).toBe("production");

      const request2 = mockRequest();
      request2.headers["x-api-key"] = apiKey2.key;
      const response2 = mockResponse();

      await authenticateApiKey(request2, response2, mockNext);

      expect(response2.locals.organizationId).toEqual(org2);
      expect(response2.locals.environment).toBe("production");
    });
  });

  describe("Invalid API key", () => {
    it("should throw UnauthorizedError for non-existent key", async () => {
      const request = mockRequest();
      request.headers["x-api-key"] = "invalid_key_does_not_exist";
      const response = mockResponse();

      await expect(authenticateApiKey(request, response, mockNext)).rejects.toThrow(UnauthorizedError);
      await expect(authenticateApiKey(request, response, mockNext)).rejects.toThrow(
        "Invalid API key. Please check your credentials.",
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Missing API key", () => {
    it("should throw UnauthorizedError when X-API-Key header is missing", async () => {
      const request = mockRequest();
      const response = mockResponse();

      await expect(authenticateApiKey(request, response, mockNext)).rejects.toThrow(UnauthorizedError);
      await expect(authenticateApiKey(request, response, mockNext)).rejects.toThrow(
        "API key is required. Please provide a valid API key in the X-API-Key header.",
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedError when X-API-Key header is empty string", async () => {
      const request = mockRequest();
      request.headers["x-api-key"] = "";
      const response = mockResponse();

      await expect(authenticateApiKey(request, response, mockNext)).rejects.toThrow(UnauthorizedError);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Case sensitivity", () => {
    it("should handle lowercase header name", async () => {
      const organizationId = new Types.ObjectId();
      const apiKey = await ApiKey.create({
        organizationId,
        key: "test_lowercase",
        environment: "production",
        description: "Test lowercase",
      });

      const request = mockRequest();
      request.headers["x-api-key"] = apiKey.key;
      const response = mockResponse();

      await authenticateApiKey(request, response, mockNext);

      expect(response.locals.organizationId).toEqual(organizationId);
      expect(mockNext).toHaveBeenCalledOnce();
    });
  });
});
