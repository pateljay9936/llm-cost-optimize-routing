import { describe, it, expect } from "vitest";
import { validateOutput } from "./output-guard";
import { DEFAULT_GUARDRAIL_CONFIG } from "./types";

describe("validateOutput", () => {
  it("passes clean output", () => {
    const result = validateOutput("The weather today is sunny and 72°F.");
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.sanitized).toBe("The weather today is sunny and 72°F.");
  });

  it("scrubs email from output", () => {
    const result = validateOutput("Contact us at support@example.com for help.");
    expect(result.passed).toBe(true);
    expect(result.sanitized).toContain("[EMAIL_REDACTED]");
    expect(result.sanitized).not.toContain("support@example.com");
    expect(result.violations.some((v) => v.rule === "output-pii-email")).toBe(true);
  });

  it("scrubs phone numbers from output", () => {
    const result = validateOutput("Call us at 555-123-4567.");
    expect(result.passed).toBe(true);
    expect(result.sanitized).toContain("[PHONE_REDACTED]");
  });

  it("scrubs SSN from output", () => {
    const result = validateOutput("Your SSN is 123-45-6789.");
    expect(result.passed).toBe(true);
    expect(result.sanitized).toContain("[SSN_REDACTED]");
  });

  it("scrubs credit card from output", () => {
    const result = validateOutput("Card ending in 4111 1111 1111 1111.");
    expect(result.passed).toBe(true);
    expect(result.sanitized).toContain("[CC_REDACTED]");
  });

  it("scrubs IP addresses from output", () => {
    const result = validateOutput("Server is at 192.168.1.100.");
    expect(result.passed).toBe(true);
    expect(result.sanitized).toContain("[IP_REDACTED]");
  });

  it("scrubs multiple PII types at once", () => {
    const result = validateOutput("Email: test@x.com, Phone: 555-111-2222");
    expect(result.passed).toBe(true);
    expect(result.sanitized).toContain("[EMAIL_REDACTED]");
    expect(result.sanitized).toContain("[PHONE_REDACTED]");
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it("blocks harmful weapon content", () => {
    const result = validateOutput("Here is how to make a bomb: step 1...");
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.rule === "harmful-weapon instructions")).toBe(true);
  });

  it("blocks harmful attack instructions", () => {
    const result = validateOutput("Here is a step-by-step guide to hack into systems");
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.rule === "harmful-attack instructions")).toBe(true);
  });

  it("respects config to disable PII scrubbing", () => {
    const result = validateOutput("Email: test@example.com", {
      ...DEFAULT_GUARDRAIL_CONFIG,
      scrubOutputPII: false,
    });
    expect(result.sanitized).toContain("test@example.com");
  });

  it("respects config to disable harmful filtering", () => {
    const result = validateOutput("how to make a bomb", {
      ...DEFAULT_GUARDRAIL_CONFIG,
      filterHarmfulOutput: false,
    });
    expect(result.passed).toBe(true);
  });
});
