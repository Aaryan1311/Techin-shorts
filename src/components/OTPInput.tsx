"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export default function OTPInput({ length = 6, onComplete, disabled = false, error = false }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const [shake, setShake] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (error) {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setValues(Array(length).fill(""));
        refs.current[0]?.focus();
      }, 600);
    }
  }, [error, length]);

  const handleChange = useCallback(
    (index: number, val: string) => {
      if (disabled) return;
      const digit = val.replace(/\D/g, "").slice(-1);
      const next = [...values];
      next[index] = digit;
      setValues(next);

      if (digit && index < length - 1) {
        refs.current[index + 1]?.focus();
      }

      if (next.every((v) => v !== "")) {
        onComplete(next.join(""));
      }
    },
    [disabled, values, length, onComplete]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !values[index] && index > 0) {
        refs.current[index - 1]?.focus();
      }
    },
    [values]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (pasted.length === length) {
        const digits = pasted.split("");
        setValues(digits);
        refs.current[length - 1]?.focus();
        onComplete(pasted);
      }
    },
    [length, onComplete]
  );

  return (
    <div
      className={`flex justify-center gap-2 sm:gap-3 ${shake ? "animate-shake" : ""}`}
      onPaste={handlePaste}
    >
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`h-14 w-12 rounded-xl border bg-gray-800 text-center text-2xl font-bold text-white outline-none transition-all
            ${error ? "border-red-500/50" : val ? "border-indigo-500/50" : "border-white/10"}
            focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
            disabled:opacity-50`}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
