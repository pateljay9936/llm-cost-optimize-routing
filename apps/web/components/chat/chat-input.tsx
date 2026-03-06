"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@llm-router/ui";
import { Input } from "@llm-router/ui";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  }, [value, disabled, onSend]);

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1"
        autoFocus
      />
      <Button onClick={handleSend} disabled={disabled || !value.trim()}>
        Send
      </Button>
    </div>
  );
}
