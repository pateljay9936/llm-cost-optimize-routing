import type { GuardrailConfig, GuardrailResult, GuardrailViolation } from "./types";
import { DEFAULT_GUARDRAIL_CONFIG } from "./types";
import { PII_PATTERNS, INJECTION_PATTERNS } from "./patterns";

/**
 * Validates user input before routing to an LLM.
 * Checks for: length limits, PII in input, prompt injection attempts.
 */
export function validateInput(
  input: string,
  config: GuardrailConfig = DEFAULT_GUARDRAIL_CONFIG
): GuardrailResult {
  const violations: GuardrailViolation[] = [];

  // 1. Length check
  if (input.length > config.maxInputLength) {
    violations.push({
      rule: "max-length",
      severity: "block",
      message: `Input exceeds maximum length of ${config.maxInputLength} characters (got ${input.length})`,
    });
  }

  // 2. Empty/whitespace check
  if (!input.trim()) {
    violations.push({
      rule: "empty-input",
      severity: "block",
      message: "Input is empty or whitespace-only",
    });
  }

  // 3. PII detection (warn, don't block — user might intentionally share)
  if (config.detectPII) {
    for (const [key, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = input.match(pattern.regex);
      if (matches) {
        violations.push({
          rule: `pii-${key}`,
          severity: "warn",
          message: `Input contains a ${pattern.label}. This will be sent to the AI model.`,
          match: matches[0],
        });
      }
    }
  }

  // 4. Prompt injection detection
  if (config.blockInjection) {
    for (const pattern of INJECTION_PATTERNS) {
      const match = input.match(pattern.regex);
      if (match) {
        violations.push({
          rule: `injection-${pattern.label}`,
          severity: "block",
          message: `Potential prompt injection detected: ${pattern.label}`,
          match: match[0],
        });
      }
    }
  }

  const hasBlock = violations.some((v) => v.severity === "block");

  return {
    passed: !hasBlock,
    violations,
  };
}
