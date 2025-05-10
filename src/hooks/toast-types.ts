
// All type definitions related to toasts

import * as React from "react";

// Define the allowed toast variants
export type ToastVariants = "default" | "destructive" | "warning" | "success" | "info";

// Toast component props
export interface ToastProps {
  variant?: ToastVariants;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  duration?: number;
}

// Toast action element interface
export type ToastActionElement = React.ReactElement<{ className?: string; altText?: string }>;

// Complete toast interface for the toast state
export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};
