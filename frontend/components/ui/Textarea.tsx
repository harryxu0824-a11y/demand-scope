"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface Props
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChange: (v: string) => void;
  autoGrow?: boolean;
}

export function Textarea({
  className,
  value,
  onChange,
  autoGrow = false,
  ...props
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!autoGrow || !ref.current) return;
    const el = ref.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, autoGrow]);

  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-fg outline-none focus:border-accent",
        className,
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
}
