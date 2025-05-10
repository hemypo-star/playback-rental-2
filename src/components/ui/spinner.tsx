
import * as React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "small" | "medium" | "large";
}

export function Spinner({ className, size = "medium", ...props }: SpinnerProps) {
  const sizeClasses = {
    small: "w-4 h-4 border-2",
    medium: "w-8 h-8 border-3",
    large: "w-12 h-12 border-4",
  };
  
  return (
    <div 
      className={cn(
        sizeClasses[size],
        "border-primary border-t-transparent rounded-full animate-spin",
        className
      )} 
      {...props}
    />
  );
}
