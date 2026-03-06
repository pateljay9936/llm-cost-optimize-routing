"use client";

interface GuardrailWarningProps {
  warnings: Array<{
    rule: string;
    severity: string;
    message: string;
  }>;
}

export function GuardrailWarning({ warnings }: GuardrailWarningProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-400 mb-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        Guardrail Alert
      </div>
      {warnings.map((w, i) => (
        <p key={i} className="text-[11px] text-yellow-300/80">
          {w.message}
        </p>
      ))}
    </div>
  );
}
