import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:brightness-110",
  ghost: "bg-transparent border border-border text-fg hover:bg-panel",
  danger: "bg-err text-white hover:brightness-110",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
