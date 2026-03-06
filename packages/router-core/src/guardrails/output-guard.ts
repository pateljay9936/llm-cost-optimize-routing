import type { GuardrailConfig, GuardrailResult, GuardrailViolation } from "./types";
import { DEFAULT_GUARDRAIL_CONFIG } from "./types";
import { PII_PATTERNS, HARMFUL_OUTPUT_PATTERNS } from "./patterns";

/**
 * Validates and sanitizes LLM output before showing to the user.
 * Scrubs PII from output and checks for harmful content patterns.
 */
export function validateOutput(
  output: string,
  config: GuardrailConfig = DEFAULT_GUARDRAIL_CONFIG
): GuardrailResult {
  const violations: GuardrailViolation[] = [];
  let sanitized = output;

  // 1. Scrub PII from output
  if (config.scrubOutputPII) {
    for (const [key, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = sanitized.match(pattern.regex);
      if (matches) {
        violations.push({
          rule: `output-pii-${key}`,
          severity: "info",
          message: `Output contained ${pattern.label}(s) — redacted`,
          match: matches[0],
        });
        sanitized = sanitized.replace(pattern.regex, pattern.redaction);
      }
    }
  }

  // 2. Check for harmful content
  if (config.filterHarmfulOutput) {
    for (const pattern of HARMFUL_OUTPUT_PATTERNS) {
      const match = sanitized.match(pattern.regex);
      if (match) {
        violations.push({
          rule: `harmful-${pattern.label}`,
          severity: "block",
          message: `Output contains potentially harmful content: ${pattern.label}`,
          match: match[0],
        });
      }
    }
  }

  const hasBlock = violations.some((v) => v.severity === "block");

  return {
    passed: !hasBlock,
    violations,
    sanitized,
  };
}
