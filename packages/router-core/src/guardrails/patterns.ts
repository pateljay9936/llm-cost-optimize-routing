/** PII detection patterns */
export const PII_PATTERNS = {
  email: {
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    label: "email address",
    redaction: "[EMAIL_REDACTED]",
  },
  phone: {
    regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    label: "phone number",
    redaction: "[PHONE_REDACTED]",
  },
  ssn: {
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    label: "SSN",
    redaction: "[SSN_REDACTED]",
  },
  creditCard: {
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    label: "credit card number",
    redaction: "[CC_REDACTED]",
  },
  ipAddress: {
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    label: "IP address",
    redaction: "[IP_REDACTED]",
  },
} as const;

/** Prompt injection patterns — common techniques to bypass system instructions */
export const INJECTION_PATTERNS = [
  {
    regex: /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/i,
    label: "instruction override",
  },
  {
    regex: /you\s+are\s+now\s+(a|an|in)\s+/i,
    label: "role hijacking",
  },
  {
    regex: /disregard\s+(your|all|any)\s+(rules|instructions|guidelines|constraints)/i,
    label: "rule disregard",
  },
  {
    regex: /pretend\s+(you('re|\s+are)\s+)?(a\s+)?(?!to\s+be\s+a\s+(helpful|assistant))/i,
    label: "persona injection",
  },
  {
    regex: /system\s*:\s*you\s+are/i,
    label: "system prompt injection",
  },
  {
    regex: /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/i,
    label: "template injection",
  },
  {
    regex: /jailbreak|DAN\s+mode|developer\s+mode|bypass\s+(filter|safety|content)/i,
    label: "jailbreak attempt",
  },
];

/** Harmful output patterns to filter */
export const HARMFUL_OUTPUT_PATTERNS = [
  {
    regex: /how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|explosive|weapon)/i,
    label: "weapon instructions",
  },
  {
    regex: /step[- ]by[- ]step\s+(guide|instructions)\s+(to|for)\s+(hack|exploit|attack)/i,
    label: "attack instructions",
  },
];
