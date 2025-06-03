import { describe, it, expect, beforeEach } from "bun:test";
import { 
  validateApiKey, 
  APICredentialsSchema, 
  authenticateUser,
  AuthenticationError,
  RateLimiter,
  type ApiKeyValidationResult 
} from "./auth";

describe("Authentication Module", () => {
  beforeEach(() => {
    // Reset any mocks or state
  });

  describe("API Key Validation", () => {
    it("validates correct MEXC API key format", async () => {
      const validKey = "mx0vABCD-1234-5678-90EF";
      const result = await validateApiKey(validKey);
      
      expect(result.isValid).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("rejects invalid API key format", async () => {
      const invalidKey = "invalid-key-format";
      const result = await validateApiKey(invalidKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid MEXC API key format");
      expect(result.userId).toBeUndefined();
    });

    it("rejects API key with wrong prefix", async () => {
      const wrongPrefixKey = "abc0vABCD-1234-5678-90EF";
      const result = await validateApiKey(wrongPrefixKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid MEXC API key format");
    });

    it("rejects API key with incorrect structure", async () => {
      const malformedKey = "mx0vABCD123456789";
      const result = await validateApiKey(malformedKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid MEXC API key format");
    });

    it("handles empty API key", async () => {
      const emptyKey = "";
      const result = await validateApiKey(emptyKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid MEXC API key format");
    });

    it("extracts consistent user ID from API key", async () => {
      const apiKey = "mx0vTEST-1234-5678-DEMO";
      const result1 = await validateApiKey(apiKey);
      const result2 = await validateApiKey(apiKey);
      
      expect(result1.userId).toBe(result2.userId);
      expect(result1.userId).toBe("TEST-123");
    });
  });

  describe("User Authentication", () => {
    it("authenticates user with valid Bearer token", async () => {
      const validKey = "mx0vTEST-1234-5678-DEMO";
      const authHeader = `Bearer ${validKey}`;
      
      const user = await authenticateUser(authHeader);
      
      expect(user.userId).toBe("TEST-123");
      expect(user.apiKey).toBe(validKey);
      expect(user.permissions).toContain("read");
      expect(user.permissions).toContain("trade");
    });

    it("throws error for missing authorization header", async () => {
      await expect(authenticateUser("")).rejects.toThrow(AuthenticationError);
    });

    it("throws error for invalid authorization header format", async () => {
      await expect(authenticateUser("InvalidHeader")).rejects.toThrow(AuthenticationError);
    });

    it("throws error for invalid API key in Bearer token", async () => {
      const invalidKey = "invalid-key";
      const authHeader = `Bearer ${invalidKey}`;
      
      await expect(authenticateUser(authHeader)).rejects.toThrow(AuthenticationError);
    });
  });

  describe("API Credentials Schema", () => {
    it("validates complete API credentials", () => {
      const validCredentials = {
        apiKey: "mx0vABCD-1234-5678-90EF",
        secretKey: "a".repeat(32) // 32 character secret key
      };
      
      const result = APICredentialsSchema.safeParse(validCredentials);
      expect(result.success).toBe(true);
    });

    it("rejects short secret key", () => {
      const invalidCredentials = {
        apiKey: "mx0vABCD-1234-5678-90EF",
        secretKey: "short" // Too short
      };
      
      const result = APICredentialsSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
    });

    it("rejects invalid API key in credentials", () => {
      const invalidCredentials = {
        apiKey: "invalid-format",
        secretKey: "a".repeat(32)
      };
      
      const result = APICredentialsSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
    });
  });

  describe("Rate Limiting", () => {
    it("allows requests within rate limit", () => {
      const rateLimiter = new RateLimiter(5, 60000); // 5 requests per minute
      const identifier = "user123";
      
      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed(identifier)).toBe(true);
      }
      
      // 6th request should be denied
      expect(rateLimiter.isAllowed(identifier)).toBe(false);
    });

    it("resets rate limit after time window", () => {
      const rateLimiter = new RateLimiter(2, 100); // 2 requests per 100ms
      const identifier = "user123";
      
      // Use up the rate limit
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
      expect(rateLimiter.isAllowed(identifier)).toBe(false);
      
      // Wait for window to reset
      return new Promise(resolve => {
        setTimeout(() => {
          expect(rateLimiter.isAllowed(identifier)).toBe(true);
          resolve(undefined);
        }, 150);
      });
    });

    it("tracks remaining requests correctly", () => {
      const rateLimiter = new RateLimiter(3, 60000);
      const identifier = "user123";
      
      expect(rateLimiter.getRemainingRequests(identifier)).toBe(3);
      
      rateLimiter.isAllowed(identifier);
      expect(rateLimiter.getRemainingRequests(identifier)).toBe(2);
      
      rateLimiter.isAllowed(identifier);
      expect(rateLimiter.getRemainingRequests(identifier)).toBe(1);
      
      rateLimiter.isAllowed(identifier);
      expect(rateLimiter.getRemainingRequests(identifier)).toBe(0);
    });
  });

  describe("Error Scenarios", () => {
    it("handles malformed input gracefully", async () => {
      // Test with null/undefined - TypeScript should catch this, but test runtime behavior
      const result = await validateApiKey(null as never);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("handles very long input", async () => {
      const veryLongKey = `mx0v${"A".repeat(1000)}`;
      const result = await validateApiKey(veryLongKey);
      expect(result.isValid).toBe(false);
    });

    it("handles special characters in API key", async () => {
      const specialCharKey = "mx0v@#$%-!@#$-!@#$-!@#$";
      const result = await validateApiKey(specialCharKey);
      expect(result.isValid).toBe(false);
    });
  });

  describe("Performance", () => {
    it("validates API key in reasonable time", async () => {
      const startTime = Date.now();
      const apiKey = "mx0vTEST-1234-5678-DEMO";
      
      await validateApiKey(apiKey);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it("handles multiple concurrent validations", async () => {
      const apiKey = "mx0vTEST-1234-5678-DEMO";
      
      const promises = Array.from({ length: 10 }, () => validateApiKey(apiKey));
      const results = await Promise.all(promises);
      
      // All should succeed
      for (const result of results) {
        expect(result.isValid).toBe(true);
      }
    });
  });
});
