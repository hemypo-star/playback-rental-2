
"use client";

import { useToastContext } from "./toast-context";
import type { ToasterToast, ToastProps, ToastActionElement } from "./toast-types";

// Main hook for component use
export function useToast() {
  const context = useToastContext();
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Standalone function for external/legacy use
export function toast(props: Omit<ToasterToast, "id">) {
  const context = useToastContext();
  if (context) {
    return context.toast(props);
  }
  
  console.warn(
    "toast() was called outside of a component. Please use useToast() hook inside a component instead."
  );
  return "";
}

export type { ToasterToast, ToastProps, ToastActionElement };
