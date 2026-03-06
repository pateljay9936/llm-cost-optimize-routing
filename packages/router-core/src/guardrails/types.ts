export type GuardrailSeverity = "block" | "warn" | "info";

export interface GuardrailViolation {
  rule: string;
  severity: GuardrailSeverity;
  message: string;
  /** The matched content that triggered the violation */
  match?: string;
}

export interface GuardrailResult {
  passed: boolean;
  violations: GuardrailViolation[];
  /** Sanitized text (PII redacted, etc.) — only set on output guards */
  sanitized?: string;
}

export interface GuardrailConfig {
  /** Max input length in characters (default: 10000) */
  maxInputLength: number;
  /** Enable PII detection on input (default: true) */
  detectPII: boolean;
  /** Block prompt injection attempts (default: true) */
  blockInjection: boolean;
  /** Scrub PII from output (default: true) */
  scrubOutputPII: boolean;
  /** Block harmful/toxic output patterns (default: true) */
  filterHarmfulOutput: boolean;
}

export const DEFAULT_GUARDRAIL_CONFIG: GuardrailConfig = {
  maxInputLength: 10000,
  detectPII: true,
  blockInjection: true,
  scrubOutputPII: true,
  filterHarmfulOutput: true,
};
