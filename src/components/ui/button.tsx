import * as React from "react";
import { cn } from "@/lib/utils";
import { useUserTheme } from "@/components/providers/user-theme-provider";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", style, ...props }, ref) => {
    const { theme } = useUserTheme();

    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-default";

    const variants = {
      default: "bg-gradient-to-r text-white shadow-lg",
      outline: "border border-slate-600 bg-slate-800/50 text-white backdrop-blur-sm",
      ghost: "text-white",
      destructive: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    };

    // Tema bazlı dinamik stiller
    const getVariantStyle = (): React.CSSProperties => {
      if (variant === "default") {
        return {
          background: `linear-gradient(to right, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`,
          boxShadow: `0 10px 15px -3px ${theme.colors.gradientFrom}33, 0 4px 6px -4px ${theme.colors.gradientFrom}33`,
        };
      }
      if (variant === "destructive") {
        return {
          boxShadow: `0 10px 15px -3px ${theme.colors.error}33, 0 4px 6px -4px ${theme.colors.error}33`,
        };
      }
      return {};
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        style={{ ...getVariantStyle(), ...style }}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
